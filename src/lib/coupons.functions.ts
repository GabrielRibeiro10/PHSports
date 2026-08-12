import { createServerFn } from "@tanstack/react-start";
import {
  couponSchema,
  evaluateCoupon,
  GENERIC_ERROR,
  normalizeCode,
  redeemSchema,
  throttled,
  type CouponResult,
} from "@/lib/coupons.server";

export type { CouponResult } from "@/lib/coupons.server";

// NOTE: request-context helpers (getRequestIP/getRequestHeader) throw
// "No Start context found in AsyncLocalStorage" in the production Worker
// runtime, so throttling is keyed by the coupon code per worker instance.

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => couponSchema.parse(input))
  .handler(async ({ data }): Promise<CouponResult> => {
    const code = normalizeCode(data.code);
    if (!code) return { ok: false, message: GENERIC_ERROR };

    if (throttled(`validate:${code}`, 60)) {
      return { ok: false, message: "Muitas tentativas. Aguarde um instante e tente novamente." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("coupons")
      .select(
        "code, discount_type, discount_value, starts_at, expires_at, max_uses, used_count, min_order_value, active",
      )
      .ilike("code", code)
      .maybeSingle();

    if (error) return { ok: false, message: GENERIC_ERROR };
    return evaluateCoupon(row, data.subtotal);
  });

// Registers an actual usage (increments used_count) — called only when the
// order is finalized, never on "Aplicar".
export const redeemCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => redeemSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const code = normalizeCode(data.code);
    if (!code) return { ok: false };
    if (throttled(`redeem:${code}`, 60)) return { ok: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ok, error } = await supabaseAdmin.rpc("redeem_coupon", { _code: code });
    if (error) return { ok: false };
    return { ok: Boolean(ok) };
  });
