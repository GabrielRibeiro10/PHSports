import { createServerFn } from "@tanstack/react-start";
import {
  couponSchema,
  evaluateCoupon,
  GENERIC_ERROR,
  exactIlike,
  normalizeCode,
  throttled,
  type CouponResult,
} from "@/lib/coupons.server";

export type { CouponResult } from "@/lib/coupons.server";

// NOTE: request-context helpers (getRequestIP/getRequestHeader) throw
// "No Start context found in AsyncLocalStorage" in the production Worker
// runtime, so throttling is keyed by the coupon code (and by a global bucket)
// per worker instance.
//
// O uso do cupom NÃO é registrado por aqui: ele é debitado dentro do banco, na mesma transação que
// cria o pedido (função create_checkout_order). Não existe endpoint público para "queimar" cupom.

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => couponSchema.parse(input))
  .handler(async ({ data }): Promise<CouponResult> => {
    const code = normalizeCode(data.code);
    if (!code) return { ok: false, message: GENERIC_ERROR };

    // Balde global além do por-código: sem ele, quem testa códigos diferentes nunca bate no limite.
    if (throttled("validate:*", 240) || throttled(`validate:${code}`, 60)) {
      return { ok: false, message: "Muitas tentativas. Aguarde um instante e tente novamente." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("coupons")
      .select(
        "code, discount_type, discount_value, starts_at, expires_at, max_uses, used_count, min_order_value, active",
      )
      .ilike("code", exactIlike(code))
      .maybeSingle();

    if (error) return { ok: false, message: GENERIC_ERROR };
    return evaluateCoupon(row, data.subtotal);
  });
