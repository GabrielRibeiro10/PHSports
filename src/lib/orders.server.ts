// Server-only: cria o pedido com preços, cupom e frete recalculados no servidor.
import { evaluateCoupon, normalizeCode, type CouponRules } from "@/lib/coupons.server";
import { computeQuote, normalizeItems, type DbProduct, type QuoteDeps } from "@/lib/shipping/quote.server";
import { cepDigits, isValidCep } from "@/lib/shipping/cep";
import type { QuoteResult, ShippingEnvironment, ShippingOption } from "@/lib/shipping/types";

export { orderInput, type OrderInput } from "@/lib/orders.schema";
import type { OrderInput } from "@/lib/orders.schema";

export type OrderErrorCode =
  | "address_mismatch"
  | "product_unavailable"
  | "coupon_invalid"
  | "shipping_unavailable"
  | "shipping_changed"
  | "quote_failed"
  | "save_failed"
  | "rate_limited";

export type OrderResult =
  | {
      ok: true;
      code: string;
      subtotal: number;
      discount: number;
      total: number;
      shipping: ShippingOption & { prepDays: number };
      environment: ShippingEnvironment;
    }
  | { ok: false; code: OrderErrorCode; message: string; quote?: QuoteResult };

export type OrderRecord = {
  customer_name: string;
  customer_whatsapp: string;
  payment_method: string;
  status: "pendente";
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping: number;
  total: number;
  shipping_service: string;
  shipping_service_key: string;
  shipping_carrier: string;
  shipping_days_min: number;
  shipping_days_max: number;
  shipping_prep_days: number;
  shipping_environment: ShippingEnvironment;
  shipping_quoted_at: string;
  ship_cep: string;
  ship_street: string;
  ship_number: string;
  ship_complement: string;
  ship_district: string;
  ship_city: string;
  ship_uf: string;
  notes: string | null;
};
export type OrderItemRecord = { product_id: string; product_name: string; size: string; quantity: number; unit_price: number };

export type OrderDeps = QuoteDeps & {
  loadCoupon: (code: string) => Promise<CouponRules | null>;
  redeemCoupon: (code: string) => Promise<boolean>;
  saveOrder: (order: OrderRecord, items: OrderItemRecord[]) => Promise<string | null>;
};

const round = (n: number) => Math.round(n * 100) / 100;
const err = (code: OrderErrorCode, message: string, quote?: QuoteResult): OrderResult => ({ ok: false, code, message, quote });

export async function createOrderCore(input: OrderInput, deps: OrderDeps): Promise<OrderResult> {
  const shipCep = cepDigits(input.shipping.cep);
  const addrCep = cepDigits(input.address.cep);
  if (!isValidCep(addrCep) || addrCep !== shipCep)
    return err("address_mismatch", "O CEP do endereço é diferente do CEP usado no frete. Calcule o frete de novo para este endereço.");

  // Preços sempre do banco: o valor enviado pelo navegador não é usado.
  const products = await deps.loadProducts([...new Set(input.items.map((i) => i.slug))]);
  const bySlug = new Map<string, DbProduct>(products.filter((p) => p.active).map((p) => [p.slug, p]));
  if (input.items.some((i) => !bySlug.has(i.slug)))
    return err("product_unavailable", "Um dos produtos do carrinho não está mais disponível. Atualize o carrinho e tente de novo.");
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

  // Frete recalculado agora, para o CEP final e o carrinho final.
  const quote = await computeQuote(
    { cep: addrCep, items: normalizeItems(input.items.map((i) => ({ slug: i.slug, qty: i.qty }))) },
    deps,
    { fresh: true },
  );
  if (!quote.ok) return err("quote_failed", quote.message, quote);
  const option = quote.options.find((o) => o.key === input.shipping.key);
  if (!option)
    return err("shipping_unavailable", "A modalidade de frete escolhida não está mais disponível para este endereço. Escolha outra.", quote);
  if (Math.abs(option.price - input.shipping.price) >= 0.01)
    return err(
      "shipping_changed",
      `O valor do frete ${option.name} mudou para R$ ${option.price.toFixed(2).replace(".", ",")}. Confira e confirme de novo.`,
      quote,
    );

  if (couponCode && !(await deps.redeemCoupon(couponCode)))
    return err("coupon_invalid", "Esse cupom acabou de esgotar ou expirou. Remova o cupom e tente de novo.");

  const total = round(Math.max(subtotal - discount, 0) + option.price);
  const a = input.address;
  const code = await deps.saveOrder(
    {
      customer_name: input.customer.name,
      customer_whatsapp: input.customer.whatsapp.replace(/[^\d+]/g, ""),
      payment_method: "pix",
      status: "pendente",
      subtotal,
      discount,
      coupon_code: couponCode,
      shipping: option.price,
      total,
      shipping_service: option.name,
      shipping_service_key: option.key,
      shipping_carrier: option.carrier,
      shipping_days_min: option.days.min,
      shipping_days_max: option.days.max,
      shipping_prep_days: quote.prepDays,
      shipping_environment: quote.environment,
      shipping_quoted_at: new Date().toISOString(),
      ship_cep: addrCep,
      ship_street: a.street,
      ship_number: a.number,
      ship_complement: a.complement ?? "",
      ship_district: a.district,
      ship_city: a.city,
      ship_uf: a.uf.toUpperCase(),
      notes: quote.environment === "sandbox" ? "TESTE: frete cotado no ambiente de teste (sandbox)." : null,
    },
    input.items.map((i) => {
      const p = bySlug.get(i.slug)!;
      return { product_id: p.id, product_name: p.name, size: i.size, quantity: i.qty, unit_price: Number(p.price) };
    }),
  );
  if (!code) return err("save_failed", "Não conseguimos registrar o pedido agora. Tente de novo em instantes.");

  return {
    ok: true,
    code,
    subtotal,
    discount,
    total,
    shipping: { ...option, prepDays: quote.prepDays },
    environment: quote.environment,
  };
}

export async function serverOrderDeps(): Promise<OrderDeps> {
  const { serverQuoteDeps } = await import("@/lib/shipping/quote.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return {
    ...(await serverQuoteDeps()),
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
    saveOrder: async (order, items) => {
      const { data, error } = await supabaseAdmin.from("orders").insert(order).select("id, code").single();
      if (error || !data) {
        console.error("[pedido] falha ao salvar", error);
        return null;
      }
      const { error: e2 } = await supabaseAdmin.from("order_items").insert(items.map((i) => ({ ...i, order_id: data.id })));
      if (e2) {
        console.error("[pedido] falha ao salvar itens", e2);
        await supabaseAdmin.from("orders").delete().eq("id", data.id);
        return null;
      }
      return data.code;
    },
  };
}
