// Server-only: cria o pedido do checkout (WhatsApp) com tudo recalculado no servidor.
import { evaluateCoupon, normalizeCode, type CouponRules } from "@/lib/coupons.server";
import { computeQuote, normalizeItems, type DbProduct, type QuoteDeps } from "@/lib/shipping/quote.server";
import { cepDigits, isValidCep } from "@/lib/shipping/cep";
import { SIZES, STORE_PHONE } from "@/lib/products";
import type { QuoteResult, ShippingEnvironment, ShippingOption } from "@/lib/shipping/types";

export { orderInput, type OrderInput } from "@/lib/orders.schema";
import type { OrderInput } from "@/lib/orders.schema";

export type OrderErrorCode =
  | "address_mismatch"
  | "product_unavailable"
  | "size_unavailable"
  | "out_of_stock"
  | "coupon_invalid"
  | "shipping_unavailable"
  | "shipping_changed"
  | "quote_failed"
  | "save_failed"
  /** banco ainda sem a migração do painel: o site cai no fluxo antigo (WhatsApp sem pedido salvo) */
  | "not_ready"
  | "rate_limited";

export type OrderResult =
  | {
      ok: true;
      code: string;
      /** false quando a mesma solicitação já tinha criado este pedido (clique repetido) */
      created: boolean;
      subtotal: number;
      discount: number;
      total: number;
      /** null = frete a combinar pelo WhatsApp */
      shipping: (ShippingOption & { prepDays: number }) | null;
      environment: ShippingEnvironment | null;
      /** número de WhatsApp da loja (configurado no painel) */
      whatsapp: string;
    }
  | { ok: false; code: OrderErrorCode; message: string; quote?: QuoteResult };

export type OrderRecord = Record<string, string | number | null>;
export type OrderItemRecord = { product_id: string; product_name: string; size: string; quantity: number; unit_price: number };

export type DbProductFull = DbProduct & { sizes: string[] | null };

export type OrderDeps = Omit<QuoteDeps, "loadProducts"> & {
  loadProducts: (slugs: string[]) => Promise<DbProductFull[]>;
  /** estoque por produto/tamanho; produto sem linhas = estoque ainda não controlado */
  loadStock: (productIds: string[]) => Promise<{ product_id: string; size: string; quantity: number }[]>;
  loadCoupon: (code: string) => Promise<CouponRules | null>;
  redeemCoupon: (code: string) => Promise<boolean>;
  /** cria o pedido de forma atômica e idempotente (mesma chave → mesmo pedido) */
  saveOrder: (key: string, order: OrderRecord, items: OrderItemRecord[]) => Promise<{ code: string; created: boolean } | "not_ready" | null>;
  storeWhatsapp: () => Promise<string | null>;
};

const round = (n: number) => Math.round(n * 100) / 100;
const err = (code: OrderErrorCode, message: string, quote?: QuoteResult): OrderResult => ({ ok: false, code, message, quote });

export async function createOrderCore(input: OrderInput, deps: OrderDeps): Promise<OrderResult> {
  const addrCep = cepDigits(input.address.cep);
  if (!isValidCep(addrCep)) return err("address_mismatch", "CEP do endereço inválido. Confira os 8 números.");
  if (input.shipping && cepDigits(input.shipping.cep) !== addrCep)
    return err("address_mismatch", "O CEP do endereço é diferente do CEP usado no frete. Calcule o frete de novo para este endereço.");

  // Produtos, preços e tamanhos sempre do banco: valores enviados pelo navegador não são usados.
  const products = await deps.loadProducts([...new Set(input.items.map((i) => i.slug))]);
  const bySlug = new Map<string, DbProductFull>(products.filter((p) => p.active).map((p) => [p.slug, p]));
  const missing = input.items.find((i) => !bySlug.has(i.slug));
  if (missing) return err("product_unavailable", "Um dos produtos do carrinho não está mais disponível. Atualize o carrinho e tente de novo.");

  for (const i of input.items) {
    const p = bySlug.get(i.slug)!;
    const allowed = p.sizes && p.sizes.length ? p.sizes : [...SIZES];
    if (!allowed.includes(i.size)) return err("size_unavailable", `O tamanho ${i.size} não existe para ${p.name}. Escolha outro tamanho no carrinho.`);
  }

  // Disponibilidade (sem reservar: a baixa só acontece quando o pagamento é confirmado no painel).
  const stock = await deps.loadStock([...new Set([...bySlug.values()].map((p) => p.id))]);
  const tracked = new Set(stock.map((s) => s.product_id));
  const need = new Map<string, number>();
  for (const i of input.items) {
    const k = `${bySlug.get(i.slug)!.id}|${i.size}`;
    need.set(k, (need.get(k) ?? 0) + i.qty);
  }
  for (const [k, q] of need) {
    const [pid, size] = k.split("|");
    if (!tracked.has(pid)) continue; // produto ainda sem controle de estoque no painel
    const have = stock.find((s) => s.product_id === pid && s.size === size)?.quantity ?? 0;
    if (have < q) {
      const name = [...bySlug.values()].find((p) => p.id === pid)!.name;
      return err(
        "out_of_stock",
        have > 0 ? `${name} tam. ${size}: só temos ${have} em estoque. Diminua a quantidade.` : `${name} tam. ${size} está esgotado.`,
      );
    }
  }

  const subtotal = round(input.items.reduce((s, i) => s + Number(bySlug.get(i.slug)!.price) * i.qty, 0));

  let discount = 0;
  let couponCode: string | null = null;
  if (input.coupon) {
    const code = normalizeCode(input.coupon);
    const ev = evaluateCoupon(code ? await deps.loadCoupon(code) : null, subtotal);
    if (!ev.ok) return err("coupon_invalid", ev.message);
    discount = ev.discount;
    couponCode = ev.code;
  }

  // Frete: se o comprador escolheu uma cotação, ela é refeita agora (CEP e carrinho finais).
  let option: ShippingOption | null = null;
  let prepDays = 0;
  let environment: ShippingEnvironment | null = null;
  if (input.shipping) {
    const quote = await computeQuote(
      { cep: addrCep, items: normalizeItems(input.items.map((i) => ({ slug: i.slug, qty: i.qty }))) },
      deps,
      { fresh: true },
    );
    if (!quote.ok) return err("quote_failed", quote.message, quote);
    option = quote.options.find((o) => o.key === input.shipping!.key) ?? null;
    if (!option)
      return err("shipping_unavailable", "A modalidade de frete escolhida não está mais disponível para este endereço. Escolha outra.", quote);
    if (Math.abs(option.price - input.shipping.price) >= 0.01)
      return err(
        "shipping_changed",
        `O valor do frete ${option.name} mudou para R$ ${option.price.toFixed(2).replace(".", ",")}. Confira e confirme de novo.`,
        quote,
      );
    prepDays = quote.prepDays;
    environment = quote.environment;
  }

  const total = round(Math.max(subtotal - discount, 0) + (option?.price ?? 0));
  const a = input.address;
  const saved = await deps.saveOrder(
    input.requestId,
    {
      customer_name: input.customer.name,
      customer_whatsapp: input.customer.whatsapp.replace(/\D/g, ""),
      payment_method: "pix",
      subtotal,
      discount,
      coupon_code: couponCode,
      shipping: option?.price ?? 0,
      total,
      shipping_status: option ? "cotado" : "pendente",
      shipping_service: option?.name ?? "",
      shipping_service_key: option?.key ?? "",
      shipping_carrier: option?.carrier ?? "",
      shipping_days_min: option?.days.min ?? null,
      shipping_days_max: option?.days.max ?? null,
      shipping_prep_days: prepDays,
      shipping_environment: environment ?? "",
      shipping_quoted_at: option ? new Date().toISOString() : null,
      ship_cep: addrCep,
      ship_street: a.street,
      ship_number: a.number,
      ship_complement: a.complement ?? "",
      ship_district: a.district,
      ship_city: a.city,
      ship_uf: a.uf.toUpperCase(),
      notes: environment === "sandbox" ? "TESTE: frete cotado no ambiente de teste (sandbox)." : null,
    },
    input.items.map((i) => {
      const p = bySlug.get(i.slug)!;
      return { product_id: p.id, product_name: p.name, size: i.size, quantity: i.qty, unit_price: Number(p.price) };
    }),
  );
  if (saved === "not_ready") return err("not_ready", "Finalize pelo WhatsApp da loja.");
  if (!saved) return err("save_failed", "Não conseguimos registrar o pedido agora. Tente de novo em instantes.");

  // O cupom só conta uso quando o pedido é criado de fato (repetições não contam de novo).
  if (couponCode && saved.created) await deps.redeemCoupon(couponCode);

  return {
    ok: true,
    code: saved.code,
    created: saved.created,
    subtotal,
    discount,
    total,
    shipping: option ? { ...option, prepDays } : null,
    environment,
    whatsapp: ((await deps.storeWhatsapp()) || STORE_PHONE).replace(/\D/g, ""),
  };
}

export async function serverOrderDeps(): Promise<OrderDeps> {
  const { serverQuoteDeps } = await import("@/lib/shipping/quote.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return {
    ...(await serverQuoteDeps()),
    loadProducts: async (slugs) => {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, slug, name, category, price, active, sizes")
        .in("slug", slugs);
      if (error) throw error;
      return (data ?? []).map((p: Omit<DbProductFull, "price"> & { price: number | string }) => ({ ...p, price: Number(p.price) }));
    },
    loadStock: async (ids) => {
      if (!ids.length) return [];
      const { data, error } = await supabaseAdmin.from("product_stock").select("product_id, size, quantity").in("product_id", ids);
      if (error) throw error;
      return data ?? [];
    },
    loadCoupon: async (code) => {
      const { data } = await supabaseAdmin
        .from("coupons")
        .select("code, discount_type, discount_value, starts_at, expires_at, max_uses, used_count, min_order_value, active")
        .ilike("code", code)
        .maybeSingle();
      return (data as CouponRules | null) ?? null;
    },
    redeemCoupon: async (code) => {
      const { data, error } = await supabaseAdmin.rpc("redeem_coupon", { _code: code });
      return !error && Boolean(data);
    },
    saveOrder: async (key, order, items) => {
      const { data, error } = await supabaseAdmin.rpc("create_checkout_order", {
        _payload: { idempotency_key: key, order, items },
      });
      // Função ainda não criada no banco (migração pendente) → avisa o site para usar o fluxo antigo.
      if (error && (error.code === "PGRST202" || error.code === "42883" || /create_checkout_order/.test(error.message ?? ""))) return "not_ready";
      if (error || !data) {
        console.error("[pedido] falha ao salvar", error);
        return null;
      }
      const r = data as { code: string; created: boolean };
      return { code: r.code, created: r.created };
    },
    storeWhatsapp: async () => {
      const { data } = await supabaseAdmin.from("store_settings").select("value").eq("key", "operacao").maybeSingle();
      const v = (data?.value ?? {}) as { whatsapp?: unknown };
      const digits = typeof v.whatsapp === "string" ? v.whatsapp.replace(/\D/g, "") : "";
      return digits.length >= 12 ? digits : null;
    },
  };
}
