// Impressão de pedidos (lista de separação e recibo). Tudo que vem do banco passa por escapeHtml.
import type { OrderItemRow, OrderRow } from "@/lib/adminOrders";

export function escapeHtml(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR");

const STYLE = `
  *{box-sizing:border-box} body{font:13px/1.45 Arial,Helvetica,sans-serif;color:#111;margin:0;padding:18mm 14mm}
  h1{font-size:18px;margin:0 0 2px} h2{font-size:13px;margin:16px 0 6px;text-transform:uppercase;letter-spacing:.04em}
  .muted{color:#555} table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{border-bottom:1px solid #ccc;padding:6px 4px;text-align:left;vertical-align:top} th{font-size:11px;text-transform:uppercase;color:#555}
  td.r,th.r{text-align:right} .box{display:inline-block;width:14px;height:14px;border:1.5px solid #111;border-radius:2px}
  .total td{font-weight:700;border-bottom:0} .page{page-break-after:always} .page:last-child{page-break-after:auto}
  .addr{margin:4px 0;white-space:pre-line} @media print{body{padding:0}}`;

function address(o: OrderRow) {
  const line1 = [o.ship_street, o.ship_number].filter(Boolean).join(", ");
  const line2 = [o.ship_complement, o.ship_district].filter(Boolean).join(" - ");
  const line3 = [o.ship_city && o.ship_uf ? `${o.ship_city}/${o.ship_uf}` : o.ship_city, o.ship_cep && `CEP ${o.ship_cep}`].filter(Boolean).join(" · ");
  return [line1, line2, line3].filter(Boolean).join("\n");
}

function header(o: OrderRow, title: string) {
  return `<h1>PH Sports · ${escapeHtml(title)}</h1><p class="muted">Pedido <b>${escapeHtml(o.code)}</b> · ${escapeHtml(when(o.created_at))}</p>
  <h2>Cliente</h2><p><b>${escapeHtml(o.customer_name || "—")}</b><br>WhatsApp: ${escapeHtml(o.customer_whatsapp || "—")}</p>
  ${address(o) ? `<p class="addr">${escapeHtml(address(o))}</p>` : '<p class="muted">Sem endereço informado (combinar pelo WhatsApp).</p>'}`;
}

/** Lista de separação: o que tirar do estoque, com caixa para marcar. */
export function pickingPage(o: OrderRow, items: OrderItemRow[]) {
  const rows = items.map((i) => `<tr><td><span class="box"></span></td><td>${escapeHtml(i.product_name)}</td><td>${escapeHtml(i.size || "—")}</td><td class="r"><b>${escapeHtml(i.quantity)}</b></td></tr>`).join("");
  const pieces = items.reduce((a, i) => a + i.quantity, 0);
  return `<section class="page">${header(o, "Lista de separação")}
  <h2>Itens (${pieces} ${pieces === 1 ? "peça" : "peças"})</h2>
  <table><thead><tr><th></th><th>Produto</th><th>Tamanho</th><th class="r">Qtd.</th></tr></thead><tbody>${rows}</tbody></table>
  ${o.notes ? `<h2>Observações</h2><p class="addr">${escapeHtml(o.notes)}</p>` : ""}</section>`;
}

/** Recibo do pedido (valores, pagamento e envio). Não é nota fiscal. */
export function receiptPage(o: OrderRow, items: OrderItemRow[]) {
  const rows = items.map((i) => `<tr><td>${escapeHtml(i.product_name)}${i.size ? ` · ${escapeHtml(i.size)}` : ""}</td><td class="r">${escapeHtml(i.quantity)}</td><td class="r">${brl(Number(i.unit_price))}</td><td class="r">${brl(Number(i.unit_price) * i.quantity)}</td></tr>`).join("");
  const pay = o.payment_status === "confirmado" ? `Pago${o.payment_confirmed_at ? ` em ${new Date(o.payment_confirmed_at).toLocaleDateString("pt-BR")}` : ""}` : o.payment_status === "reembolsado" ? "Reembolsado" : "Pagamento pendente";
  const ship = o.shipping_status === "pendente" ? "A combinar" : brl(Number(o.shipping));
  return `<section class="page">${header(o, "Recibo")}
  <h2>Itens</h2><table><thead><tr><th>Produto</th><th class="r">Qtd.</th><th class="r">Unitário</th><th class="r">Subtotal</th></tr></thead><tbody>${rows}
  <tr><td colspan="3" class="r muted">Produtos</td><td class="r">${brl(Number(o.subtotal))}</td></tr>
  ${Number(o.discount) > 0 ? `<tr><td colspan="3" class="r muted">Desconto${o.coupon_code ? ` (${escapeHtml(o.coupon_code)})` : ""}</td><td class="r">- ${brl(Number(o.discount))}</td></tr>` : ""}
  <tr><td colspan="3" class="r muted">Frete${o.shipping_service ? ` (${escapeHtml(o.shipping_service)})` : ""}</td><td class="r">${escapeHtml(ship)}</td></tr>
  <tr class="total"><td colspan="3" class="r">Total</td><td class="r">${brl(Number(o.total))}</td></tr></tbody></table>
  <p><b>Pagamento:</b> ${escapeHtml(pay)}${o.payment_method ? ` · ${escapeHtml(o.payment_method)}` : ""}</p>
  ${o.tracking_code ? `<p><b>Rastreio:</b> ${escapeHtml(o.tracking_carrier || "")} ${escapeHtml(o.tracking_code)}</p>` : ""}
  <p class="muted">Obrigado pela compra! Este documento é um recibo e não substitui nota fiscal.</p></section>`;
}

export function printDocument(title: string, pagesHtml: string) {
  const w = window.open("", "_blank");
  if (!w) throw new Error("O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente de novo.");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body>${pagesHtml}</body></html>`);
  w.document.close();
  w.focus();
  w.addEventListener("load", () => w.print());
  window.setTimeout(() => { try { w.print(); } catch { /* já impresso */ } }, 600);
}
