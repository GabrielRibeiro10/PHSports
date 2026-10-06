// Server-only coupon helpers. Never imported by client code.
import { z } from "zod";

export const couponSchema = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.number().finite().min(0).max(1_000_000),
});

export const GENERIC_ERROR = "Cupom inválido ou não disponível para esta compra.";

export function normalizeCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase().slice(0, 40);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Lightweight in-memory throttle per IP (best effort, per worker instance).
const attempts = new Map<string, { count: number; resetAt: number }>();

export function throttled(ip: string, limit = 12): boolean {
  const now = Date.now();
  const cur = attempts.get(ip);
  if (!cur || cur.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  cur.count += 1;
  return cur.count > limit;
}

export type CouponRules = {
  code: string;
  discount_type: string;
  discount_value: number | string;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number;
  used_count: number;
  min_order_value: number | string;
  active: boolean;
};

export type CouponResult =
  | { ok: true; code: string; subtotal: number; discount: number; total: number }
  | { ok: false; message: string };

// Authoritative server-side evaluation: subtotal, discount and total are
// always recomputed here from the admin-configured rules.
export function evaluateCoupon(row: CouponRules | null, subtotal: number): CouponResult {
  const safeSubtotal = Math.round(Math.max(subtotal, 0) * 100) / 100;
  if (!row || !row.active) return { ok: false, message: GENERIC_ERROR };

  const today = todayISO();
  if (row.starts_at && String(row.starts_at).slice(0, 10) > today) {
    return { ok: false, message: GENERIC_ERROR };
  }
  if (row.expires_at && String(row.expires_at).slice(0, 10) < today) {
    return { ok: false, message: GENERIC_ERROR };
  }
  if (row.max_uses > 0 && row.used_count >= row.max_uses) {
    return { ok: false, message: GENERIC_ERROR };
  }

  const min = Number(row.min_order_value) || 0;
  if (safeSubtotal < min) {
    return {
      ok: false,
      message: `Este cupom exige uma compra mínima de R$ ${min.toFixed(2).replace(".", ",")}.`,
    };
  }

  const value = Number(row.discount_value) || 0;
  const raw = row.discount_type === "percent" ? (safeSubtotal * value) / 100 : value;
  const discount = Math.min(Math.max(Math.round(raw * 100) / 100, 0), safeSubtotal);

  return {
    ok: true,
    code: row.code,
    subtotal: safeSubtotal,
    discount,
    total: Math.round((safeSubtotal - discount) * 100) / 100,
  };
}
