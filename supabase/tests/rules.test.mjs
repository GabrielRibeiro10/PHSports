import { makeDb, as } from "./setup.mjs";
import assert from "node:assert/strict";
const db = await makeDb();
const ADMIN = "00000000-0000-0000-0000-00000000000a", USER = "00000000-0000-0000-0000-00000000000b";
await db.exec(`insert into auth.users values ('${ADMIN}','dono@loja.com'),('${USER}','x@y.com'); insert into public.user_roles (user_id, role) values ('${ADMIN}','admin');`);
const admin = (fn) => as(db, "authenticated", { sub: ADMIN, email: "dono@loja.com", role: "authenticated" }, fn);
const user = (fn) => as(db, "authenticated", { sub: USER, role: "authenticated" }, fn);
const anon = (fn) => as(db, "anon", {}, fn);
const svc = (fn) => as(db, "service_role", { role: "service_role" }, fn);
const rpc = async (who, sql, params = []) => who((tx) => tx.query(sql, params)).then((r) => r.rows[0] && Object.values(r.rows[0])[0]);
const fails = async (p, re) => { try { await p; } catch (e) { if (re && !re.test(e.message)) throw new Error(`erro inesperado: ${e.message}`); return e.message; } throw new Error("deveria falhar: " + re); };
let n = 0; const ok = (name) => console.log(`  ✓ ${++n}. ${name}`);

const [p1, p2] = (await db.query("select id, name, price from public.products order by sort_order, name limit 2")).rows;
const item = (p, size, q) => ({ product_id: p.id, product_name: p.name, size, quantity: q, unit_price: Number(p.price) });
const payload = (key, items, extra = {}) => ({ idempotency_key: key, items, order: {
  customer_name: "Maria Silva", customer_whatsapp: "12999990000", subtotal: items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
  total: items.reduce((s, i) => s + i.unit_price * i.quantity, 0), shipping_status: "pendente", ship_cep: "01310100", ship_city: "São Paulo", ...extra } });
const create = (key, items, extra) => rpc(svc, "select public.create_checkout_order($1::jsonb)", [JSON.stringify(payload(key, items, extra))]);
const order = async (id) => (await db.query("select * from public.orders where id=$1", [id])).rows[0];
const stock = async (p, s) => (await db.query("select quantity from public.product_stock where product_id=$1 and size=$2", [p.id, s])).rows[0]?.quantity ?? null;

console.log("Pedidos do checkout");
const r1 = await create("chave-pedido-0001-abcdef", [item(p1, "M", 2), item(p2, "G", 1)]);
const r1b = await create("chave-pedido-0001-abcdef", [item(p1, "M", 2), item(p2, "G", 1)]);
assert.equal(r1.created, true); assert.equal(r1b.created, false); assert.equal(r1b.code, r1.code);
assert.equal((await db.query("select count(*)::int c from public.orders")).rows[0].c, 1);
ok("mesma solicitação repetida não duplica o pedido (mesmo número " + r1.code + ")");
const o1 = await order(r1.id);
assert.equal(o1.fulfillment_status, "aguardando_atendimento"); assert.equal(o1.payment_status, "pendente"); assert.equal(o1.shipping_status, "pendente");
assert.equal((await db.query("select count(*)::int c from public.order_items where order_id=$1", [r1.id])).rows[0].c, 2);
assert.equal((await db.query("select count(*)::int c from public.order_events where order_id=$1 and kind='criado'", [r1.id])).rows[0].c, 1);
assert.equal((await db.query("select count(*)::int c from public.customers")).rows[0].c, 1);
ok("pedido nasce 'Aguardando atendimento' + pagamento 'Pendente' + frete pendente, com itens, histórico e cliente");

console.log("Segurança");
await fails(rpc(anon, "select public.create_checkout_order($1::jsonb)", [JSON.stringify(payload("chave-anon-0000000001", [item(p1, "M", 1)]))]), /permission denied/);
await fails(rpc(user, "select public.create_checkout_order($1::jsonb)", [JSON.stringify(payload("chave-user-0000000001", [item(p1, "M", 1)]))]), /permission denied/);
ok("visitante e usuário comum não criam pedido direto no banco (só o servidor)");
await fails(anon((tx) => tx.query("select * from public.orders")), /permission denied/);
assert.equal((await user((tx) => tx.query("select * from public.orders"))).rows.length, 0);
assert.equal((await user((tx) => tx.query("select * from public.order_items"))).rows.length, 0);
assert.equal((await user((tx) => tx.query("select * from public.customers"))).rows.length, 0);
assert.equal((await user((tx) => tx.query("select * from public.order_events"))).rows.length, 0);
ok("visitante/usuário sem admin não leem pedidos, itens, clientes nem histórico");
await fails(rpc(user, "select public.admin_confirm_payment($1, 100)", [r1.id]), /restrito a administradores/);
await fails(rpc(anon, "select public.admin_confirm_payment($1, 100)", [r1.id]), /permission denied/);
await fails(rpc(user, "select public.admin_adjust_stock($1,'M',5,'reposicao')", [p1.id]), /restrito a administradores/);
await fails(rpc(user, "select public.admin_dashboard(now()-interval '1 day', now())"), /restrito a administradores/);
ok("ações do painel recusadas para quem não é admin (checagem no banco)");
await fails(admin((tx) => tx.query("update public.orders set payment_status='confirmado' where id=$1", [r1.id])), /permission denied/);
await fails(admin((tx) => tx.query("delete from public.orders where id=$1", [r1.id])), /permission denied/);
await fails(admin((tx) => tx.query("insert into public.product_stock values ($1,'M',99)", [p1.id])), /permission denied|row-level/);
ok("nem o admin altera pedido/estoque direto na tabela: só pelas ações com regras");
const upd = await anon((tx) => tx.query("update public.products set price=1 where id=$1", [p1.id])).catch((e) => e.message);
assert.equal((await order(r1.id)).total, o1.total); assert.equal((await db.query("select price from public.products where id=$1", [p1.id])).rows[0].price, p1.price);
assert.ok(typeof upd === "string" || upd.affectedRows === 0);
assert.ok((await anon((tx) => tx.query("select * from public.product_stock"))).rows !== undefined);
ok("visitante não altera preço; disponibilidade por tamanho é pública (só leitura)");

console.log("Estoque");
await rpc(admin, "select public.admin_adjust_stock($1,'m',2,'reposicao','chegada fornecedor')", [p1.id]);
assert.equal(await stock(p1, "M"), 2);
await fails(rpc(admin, "select public.admin_adjust_stock($1,'M',-1,'ajuste')", [p1.id]), /Explique o motivo/);
await fails(rpc(admin, "select public.admin_adjust_stock($1,'M',-5,'ajuste','perda')", [p1.id]), /negativo/);
await fails(rpc(admin, "select public.admin_adjust_stock($1,'M',-1,'reposicao','x')", [p1.id]), /Reposição deve somar/);
assert.equal((await db.query("select stock from public.products where id=$1", [p1.id])).rows[0].stock, 2);
assert.equal((await db.query("select count(*)::int c from public.stock_movements")).rows[0].c, 1);
ok("reposição registra histórico; ajuste exige motivo; nunca fica negativo; total do produto sincroniza");

console.log("Pagamento");
await fails(rpc(admin, "select public.admin_confirm_payment($1,$2)", [r1.id, o1.total]), /Frete pendente/);
ok("não confirma pagamento com frete pendente (falta de cotação não vira frete grátis)");
const t = await rpc(admin, "select public.admin_set_shipping($1, 25.5, 'Correios PAC', '5 a 8')", [r1.id]);
const o1b = await order(r1.id);
assert.equal(Number(o1b.total), Number(o1.subtotal) + 25.5); assert.equal(o1b.shipping_status, "manual"); assert.equal(Number(t.total), Number(o1b.total));
ok("frete manual atualiza o total antes do pagamento (" + o1b.total + ")");
await fails(rpc(admin, "select public.admin_confirm_payment($1, 10)", [r1.id]), /diferente do total/);
const before = await stock(p1, "M");
const miss = await fails(rpc(admin, "select public.admin_confirm_payment($1,$2)", [r1.id, o1b.total]), /Estoque insuficiente/);
assert.equal(await stock(p1, "M"), before); assert.equal((await order(r1.id)).payment_status, "pendente");
ok("falta de estoque bloqueia a confirmação e nada é baixado: " + miss.split("—")[1].trim());
await rpc(admin, "select public.admin_adjust_stock($1,'G',1,'reposicao')", [p2.id]);
const c1 = await rpc(admin, "select public.admin_confirm_payment($1,$2,'Pix recebido')", [r1.id, o1b.total]);
const o1c = await order(r1.id);
assert.equal(c1.already, false); assert.equal(o1c.payment_status, "confirmado"); assert.equal(o1c.payment_confirmed_by, ADMIN);
assert.equal(o1c.payment_confirmed_by_email, "dono@loja.com"); assert.equal(Number(o1c.payment_confirmed_amount), Number(o1b.total)); assert.ok(o1c.stock_deducted_at);
assert.equal(await stock(p1, "M"), 0); assert.equal(await stock(p2, "G"), 0);
ok("confirmação registra quem/quando/valor e baixa o estoque");
const c2 = await rpc(admin, "select public.admin_confirm_payment($1,$2)", [r1.id, o1b.total]);
assert.equal(c2.already, true); assert.equal(await stock(p1, "M"), 0);
assert.equal((await db.query("select count(*)::int c from public.stock_movements where reason='venda'")).rows[0].c, 2);
ok("confirmar de novo não baixa estoque de novo");
await fails(rpc(admin, "select public.admin_set_shipping($1, 1, 'x')", [r1.id]), /antes da confirmação/);
ok("frete não muda depois do pagamento confirmado");

console.log("Disputa pelo último item");
await rpc(admin, "select public.admin_adjust_stock($1,'GG',1,'reposicao')", [p1.id]);
const a = await create("chave-disputa-a-000001", [item(p1, "GG", 1)], { shipping_status: "cotado", shipping: 0 });
const b = await create("chave-disputa-b-000001", [item(p1, "GG", 1)], { shipping_status: "cotado", shipping: 0 });
await rpc(admin, "select public.admin_confirm_payment($1,$2)", [a.id, (await order(a.id)).total]);
await fails(rpc(admin, "select public.admin_confirm_payment($1,$2)", [b.id, (await order(b.id)).total]), /precisa 1, disponível 0/);
assert.equal(await stock(p1, "GG"), 0);
ok("dois pedidos do último item: só o primeiro confirma; estoque não fica negativo");

console.log("Atendimento e entrega");
await fails(rpc(admin, "select public.admin_set_fulfillment($1,'em_preparacao')", [b.id]), /Confirme o pagamento/);
await fails(rpc(admin, "select public.admin_set_fulfillment($1,'enviado','Correios')", [r1.id]), /Só pedidos em preparação/);
await rpc(admin, "select public.admin_set_fulfillment($1,'em_preparacao')", [r1.id]);
await fails(rpc(admin, "select public.admin_set_fulfillment($1,'enviado','')", [r1.id]), /transportadora/);
await fails(rpc(admin, "select public.admin_set_fulfillment($1,'entregue')", [r1.id]), /Só pedidos enviados/);
await rpc(admin, "select public.admin_set_fulfillment($1,'enviado','Correios','BR123456789BR','2026-10-06')", [r1.id]);
let o = await order(r1.id); assert.equal(o.tracking_code, "BR123456789BR"); assert.equal(o.tracking_carrier, "Correios");
await fails(rpc(admin, "select public.admin_cancel_order($1,'desistiu')", [r1.id]), /já enviado/);
await rpc(admin, "select public.admin_set_fulfillment($1,'entregue')", [r1.id]);
assert.equal((await order(r1.id)).fulfillment_status, "entregue");
ok("transições válidas: pago → preparação → enviado (com transportadora/rastreio) → entregue; saltos e incoerências bloqueados");

console.log("Cancelamento e reembolso");
await rpc(admin, "select public.admin_set_fulfillment($1,'em_preparacao')", [a.id]);
const x1 = await rpc(admin, "select public.admin_cancel_order($1,'cliente desistiu', true)", [a.id]);
const x2 = await rpc(admin, "select public.admin_cancel_order($1,'de novo', true)", [a.id]);
assert.equal(x1.restocked, true); assert.equal(x2.already, true); assert.equal(await stock(p1, "GG"), 1);
assert.equal((await db.query("select count(*)::int c from public.stock_movements where reason='cancelamento'")).rows[0].c, 1);
assert.equal((await order(a.id)).payment_status, "confirmado");
ok("cancelar pedido pago devolve o estoque uma única vez; pagamento continua 'confirmado' (cancelar ≠ reembolsar)");
const x3 = await rpc(admin, "select public.admin_cancel_order($1,'abandonou o WhatsApp', true)", [b.id]);
assert.equal(x3.restocked, false); assert.equal(await stock(p1, "GG"), 1);
ok("cancelar pedido pendente (estoque nunca baixado) não devolve nada");
await fails(rpc(admin, "select public.admin_confirm_payment($1,$2)", [b.id, (await order(b.id)).total]), /cancelado/);
await fails(rpc(admin, "select public.admin_set_fulfillment($1,'em_preparacao')", [b.id]), /cancelado/);
await fails(rpc(admin, "select public.admin_register_refund($1, 10, 'x')", [b.id]), /pagamento confirmado/);
await fails(rpc(admin, "select public.admin_register_refund($1, 99999, 'x')", [a.id]), /inválido/);
await rpc(admin, "select public.admin_register_refund($1, $2, 'Pix devolvido')", [a.id, (await order(a.id)).total]);
assert.equal((await order(a.id)).payment_status, "reembolsado"); assert.equal(await stock(p1, "GG"), 1);
ok("reembolso só em pedido pago, com valor válido, e não mexe em estoque");

console.log("Preço e resumo");
await db.query("update public.products set price = price + 50 where id=$1", [p1.id]);
assert.equal(Number((await db.query("select unit_price from public.order_items where order_id=$1 and product_id=$2", [r1.id, p1.id])).rows[0].unit_price), Number(p1.price));
ok("mudar o preço do produto não altera pedidos antigos");
await rpc(admin, "select public.admin_add_order_note($1,'Cliente pediu embalagem para presente')", [r1.id]);
const ev = (await admin((tx) => tx.query("select kind from public.order_events where order_id=$1 order by created_at", [r1.id]))).rows.map((r) => r.kind);
assert.deepEqual(ev.filter((k) => k !== "criado"), ["frete", "pagamento_confirmado", "em_preparacao", "enviado", "entregue", "nota"]);
ok("histórico completo do pedido: " + ev.join(" → "));
const d = await rpc(admin, "select public.admin_dashboard(now() - interval '30 days', now() + interval '1 day', 3)");
assert.equal(Number(d.revenue), Number((await order(r1.id)).total)); assert.equal(d.paid_orders, 1);
assert.equal(d.awaiting, 0); assert.equal(d.payment_pending, 0); assert.equal(d.paid_to_ship, 0);
const pend = await create("chave-pendente-0000001", [item(p2, "P", 1)]);
const d2 = await rpc(admin, "select public.admin_dashboard(now() - interval '30 days', now() + interval '1 day', 3)");
assert.equal(d2.awaiting, 1); assert.equal(d2.payment_pending, 1); assert.equal(d2.shipping_pending, 1); assert.equal(Number(d2.revenue), Number(d.revenue));
assert.ok(d2.low_stock.some((l) => l.size === "M" && l.quantity === 0));
ok("resumo: receita só de pagos (sem cancelado/reembolsado/pendente); contadores e estoque baixo reais");
console.log(`\n${n} verificações passaram.`);

console.log("Produtos");
await fails(admin((tx) => tx.query("delete from public.products where id=$1", [p1.id])), /já tem pedidos/);
const fresh = (await db.query("insert into public.products (slug,name,club,category,price) values ('teste-x','Teste','X','masculino',10) returning id")).rows[0].id;
await admin((tx) => tx.query("delete from public.products where id=$1", [fresh]));
await admin((tx) => tx.query("update public.products set active=false, price=199.9, description='nova' where id=$1", [p2.id]));
assert.equal((await anon((tx) => tx.query("select * from public.products where id=$1", [p2.id]))).rows.length, 0);
await admin((tx) => tx.query("update public.products set active=true where id=$1", [p2.id]));
assert.equal(Number((await anon((tx) => tx.query("select price from public.products where id=$1", [p2.id]))).rows[0].price), 199.9);
ok("admin edita/desativa/publica produto (loja vê só ativos); produto já vendido não pode ser apagado, sem vendas pode");
console.log(`\n${n} verificações passaram.`);

console.log("Endurecimento (migração 20261007120000)");
{
const [f1, f2] = (await db.query("select id, name, price from public.products where active order by sort_order, name limit 2")).rows;
const fi = (p, size, q, over = {}) => ({ product_id: p.id, product_name: p.name, size, quantity: q, unit_price: Number(p.price), ...over });
const countOrders = async () => (await db.query("select count(*)::int c from public.orders")).rows[0].c;
const usedCount = async (code) => (await db.query("select used_count from public.coupons where code=$1", [code])).rows[0].used_count;

// 24. Preço/total adulterados não viram pedido (o banco reconfere contra o catálogo)
const ordersBefore = await countOrders();
const sub = Number(f1.price);
await fails(create("chave-tamper-preco-00001", [fi(f1, "M", 1, { unit_price: 1 })]), /Preço do item diferente do catálogo/);
await fails(create("chave-tamper-subtot-0001", [fi(f1, "M", 1)], { subtotal: 1, total: 1 }), /Subtotal diferente do catálogo/);
await fails(create("chave-tamper-total-0001", [fi(f1, "M", 1)], { subtotal: sub, total: 1 }), /Total diferente do calculado/);
await fails(create("chave-tamper-desc-00001", [fi(f1, "M", 1)], { subtotal: sub, discount: 10, total: sub - 10 }), /Desconto sem cupom/);
await fails(create("chave-tamper-frete-0001", [fi(f1, "M", 1)], { subtotal: sub, shipping: -50, total: sub - 50 }), /Frete inválido/);
await fails(create("chave-tamper-qtd-000001", [fi(f1, "M", 0)], { subtotal: 0, total: 0 }), /Quantidade inválida/);
await db.query("update public.products set active=false where id=$1", [f2.id]);
await fails(create("chave-tamper-inativo-01", [fi(f2, "M", 1)]), /Produto indisponível/);
await db.query("update public.products set active=true where id=$1", [f2.id]);
assert.equal(await countOrders(), ordersBefore);
ok("preço, subtotal, total, desconto, frete, quantidade ou produto inativo adulterados são recusados e nenhum pedido é criado");

// 25. Cupom: debitado junto com o pedido; esgotado = pedido recusado; repetição não debita de novo
await db.query("insert into public.coupons (code, discount_type, discount_value, max_uses, active) values ('UMUSO','percent',10,1,true), ('INATIVO','percent',10,0,false), ('VENCIDO','percent',10,0,true)");
await db.query("update public.coupons set expires_at = current_date - 1 where code='VENCIDO'");
const withCoupon = (key, code) => create(key, [fi(f1, "M", 1)], { subtotal: sub, discount: Math.round(sub * 10) / 100, total: Math.round((sub - Math.round(sub * 10) / 100) * 100) / 100, coupon_code: code });
const c1 = await withCoupon("chave-cupom-a-000001", "umuso");
assert.equal(c1.created, true); assert.equal(await usedCount("UMUSO"), 1);
const ordersAfterA = await countOrders();
await fails(withCoupon("chave-cupom-b-000001", "UMUSO"), /coupon_unavailable/);
assert.equal(await countOrders(), ordersAfterA); assert.equal(await usedCount("UMUSO"), 1);
const c1b = await withCoupon("chave-cupom-a-000001", "UMUSO");
assert.equal(c1b.created, false); assert.equal(c1b.code, c1.code); assert.equal(await usedCount("UMUSO"), 1);
await fails(withCoupon("chave-cupom-c-000001", "INATIVO"), /coupon_unavailable/);
await fails(withCoupon("chave-cupom-d-000001", "VENCIDO"), /coupon_unavailable/);
assert.equal(await countOrders(), ordersAfterA);
ok("cupom de 1 uso: o 2º pedido é recusado (sem desconto e sem pedido criado); repetir o 1º não debita de novo; cupom inativo/vencido recusado");

// 26. Limite de pedidos pendentes por WhatsApp (vale para qualquer instância do servidor)
for (let i = 0; i < 10; i++) await create(`chave-spam-${String(i).padStart(10, "0")}`, [fi(f1, "M", 1)], { subtotal: sub, total: sub, customer_whatsapp: "11988887777" });
await fails(create("chave-spam-extra-000001", [fi(f1, "M", 1)], { subtotal: sub, total: sub, customer_whatsapp: "11988887777" }), /rate_limited/);
const outro = await create("chave-spam-outro-00001", [fi(f1, "M", 1)], { subtotal: sub, total: sub, customer_whatsapp: "11977776666" });
assert.equal(outro.created, true);
const repeat = await create("chave-spam-0000000003", [fi(f1, "M", 1)], { subtotal: sub, total: sub, customer_whatsapp: "11988887777" });
assert.equal(repeat.created, false);
ok("11º pedido pendente do mesmo WhatsApp na hora é recusado; outro número e repetição de chave existente continuam funcionando");

// 27. Auditoria: ninguém forja ação de admin
await fails(anon((tx) => tx.query("insert into public.audit_log (actor_id, action) values (null, 'product.update')")), /permission denied|row-level security/);
await fails(user((tx) => tx.query("insert into public.audit_log (actor_id, action) values ($1, 'product.update')", [USER])), /row-level security/);
await fails(user((tx) => tx.query("insert into public.audit_log (actor_id, action) values ($1, 'admin.login.failure')", [ADMIN])), /row-level security/);
await user((tx) => tx.query("insert into public.audit_log (actor_id, action) values ($1, 'admin.login.failure')", [USER]));
await admin((tx) => tx.query("insert into public.audit_log (actor_id, action) values ($1, 'product.update')", [ADMIN]));
assert.equal((await user((tx) => tx.query("select * from public.audit_log"))).rows.length, 0);
assert.equal((await admin((tx) => tx.query("select * from public.audit_log"))).rows.length, 2);
ok("usuário comum só registra a própria tentativa de login (nunca ação de admin, nem em nome do admin); só admin lê o log");

// 28. Configurações da loja (Pix/frete/operação) deixam de ser públicas
await db.query("insert into public.store_settings (key, value) values ('operacao', '{\"pix\":\"chave-secreta-pix\"}') on conflict (key) do update set value=excluded.value");
await fails(anon((tx) => tx.query("select * from public.store_settings")), /permission denied/);
assert.equal((await user((tx) => tx.query("select * from public.store_settings"))).rows.length, 0);
assert.ok((await admin((tx) => tx.query("select * from public.store_settings"))).rows.length >= 1);
assert.ok((await svc((tx) => tx.query("select * from public.store_settings"))).rows.length >= 1);
await fails(user((tx) => tx.query("update public.store_settings set value='{}'")).then((r) => { if (!r.affectedRows) throw new Error("row-level: 0 linhas"); }), /row-level|permission/);
ok("visitante e usuário comum não leem nem alteram as configurações; admin e servidor continuam lendo");

// 29. Cupom não pode ser 'queimado' por fora + não dá para virar admin + escrita direta bloqueada
await fails(rpc(anon, "select public.redeem_coupon('UMUSO')"), /permission denied/);
await fails(rpc(user, "select public.redeem_coupon('UMUSO')"), /permission denied/);
await fails(user((tx) => tx.query("insert into public.user_roles (user_id, role) values ($1, 'admin')", [USER])), /row-level security/);
assert.equal((await db.query("select count(*)::int c from public.user_roles where user_id=$1", [USER])).rows[0].c, 0);
await fails(user((tx) => tx.query("insert into public.coupons (code, discount_value) values ('GRATIS',100)")), /row-level security/);
const priceTry = await user((tx) => tx.query("update public.products set price = 1")); assert.equal(priceTry.affectedRows, 0);
await fails(user((tx) => tx.query("insert into public.product_stock values ($1,'XG',999)", [f1.id])), /permission denied|row-level/);
ok("visitante/usuário não queimam cupom, não se promovem a admin, não criam cupom, não mudam preço nem estoque");
}
console.log(`\n${n} verificações passaram.`);
