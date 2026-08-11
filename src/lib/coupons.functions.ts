import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.number().finite().min(0).max(1_000_000),
});

const GENERIC_ERROR = "Cupom inválido ou expirado. Verifique o código e tente novamente.";

export type CouponResult =
  | { ok: true; code: string; discount: number; total: number }
  | { ok: false; message: string };

// Lightweight in-memory throttle per IP (best effort, per worker instance).
const attempts = new Map<string, { count: number; resetAt: number }>();
function throttled(ip: string) {
  const now = Date.now();
  const cur = attempts.get(ip);
  if (!cur || cur.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  cur.count += 1;
  return cur.count > 12;
}

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<CouponResult> => {
    const code = data.code.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase().slice(0, 40);
    if (!code) return { ok: false, message: GENERIC_ERROR };

    let ip = "unknown";
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    } catch {
      /* ignore */
    }
    if (throttled(ip)) {
      return { ok: false, message: "Muitas tentativas. Aguarde um instante e tente novamente." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("coupons")
      .select("code, discount_type, discount_value, expires_at, max_uses, used_count, min_order_value, active")
      .eq("code", code)
      .maybeSingle();

    if (error || !row || !row.active) return { ok: false, message: GENERIC_ERROR };

    if (row.expires_at) {
      const today = new Date().toISOString().slice(0, 10);
      if (String(row.expires_at).slice(0, 10) < today) return { ok: false, message: GENERIC_ERROR };
    }
    if (row.max_uses > 0 && row.used_count >= row.max_uses) {
      return { ok: false, message: GENERIC_ERROR };
    }
    const min = Number(row.min_order_value) || 0;
    if (data.subtotal < min) {
      return {
        ok: false,
        message: `Este cupom é válido para pedidos a partir de R$ ${min.toFixed(2).replace(".", ",")}.`,
      };
    }

    const value = Number(row.discount_value) || 0;
    const raw = row.discount_type === "percent" ? (data.subtotal * value) / 100 : value;
    const discount = Math.min(Math.max(Math.round(raw * 100) / 100, 0), data.subtotal);

    return {
      ok: true,
      code: row.code,
      discount,
      total: Math.round((data.subtotal - discount) * 100) / 100,
    };
  });
