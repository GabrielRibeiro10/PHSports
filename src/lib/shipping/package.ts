import type { CategoryId } from "@/lib/products";
import type { ShippingSettings } from "./types";
import { cepDigits, isValidCep } from "./cep";

export type Package = {
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  /** valor declarado (soma dos produtos), para o seguro */
  insurance_value: number;
};

export type PackageLine = { category: CategoryId; qty: number; unitPrice: number };

/** Limites dos Correios para um volume (PAC/SEDEX). */
export const CORREIOS_LIMITS = { maxWeightKg: 30, maxSideCm: 100, maxSumCm: 200, minLength: 16, minWidth: 11, minHeight: 2 };

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN);
const pos = (v: unknown) => {
  const n = num(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Lê e valida a configuração salva no painel. Devolve null quando falta algo essencial
 * (CEP de origem ou medidas da caixa) — nunca completa com valores inventados.
 */
export function parseSettings(raw: unknown): ShippingSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const box = (r.box ?? {}) as Record<string, unknown>;
  const origin = cepDigits(String(r.origin_cep ?? ""));
  const length = pos(box.length_cm);
  const width = pos(box.width_cm);
  const base = num(box.base_height_cm);
  const empty = num(box.empty_weight_g);
  if (!isValidCep(origin) || !length || !width || !Number.isFinite(base) || base < 0 || !Number.isFinite(empty) || empty < 0)
    return null;
  const items: ShippingSettings["items"] = {};
  const rawItems = (r.items ?? {}) as Record<string, Record<string, unknown>>;
  for (const [cat, v] of Object.entries(rawItems)) {
    const w = pos(v?.weight_g);
    const t = pos(v?.thickness_cm);
    if (w && t) items[cat as CategoryId] = { weight_g: w, thickness_cm: t };
  }
  const prep = num(r.prep_days);
  return {
    origin_cep: origin,
    prep_days: Number.isFinite(prep) && prep >= 0 ? Math.min(30, Math.round(prep)) : 0,
    box: { length_cm: length, width_cm: width, base_height_cm: base, empty_weight_g: empty },
    items,
  };
}

export type PackageResult =
  | { ok: true; pkg: Package }
  | { ok: false; code: "package_config" | "too_big" | "empty_cart"; missing?: CategoryId[] };

/**
 * Um volume com todos os itens: peso = caixa vazia + soma dos itens; altura = base da caixa
 * + espessura de cada peça dobrada. Assim 3 camisas pesam e ocupam 3x, não 1x.
 */
export function buildPackage(lines: PackageLine[], s: ShippingSettings): PackageResult {
  const valid = lines.filter((l) => l.qty > 0);
  if (!valid.length) return { ok: false, code: "empty_cart" };
  const missing = [...new Set(valid.filter((l) => !s.items[l.category]).map((l) => l.category))];
  if (missing.length) return { ok: false, code: "package_config", missing };

  let grams = s.box.empty_weight_g;
  let height = s.box.base_height_cm;
  let value = 0;
  for (const l of valid) {
    const it = s.items[l.category]!;
    grams += it.weight_g * l.qty;
    height += it.thickness_cm * l.qty;
    value += l.unitPrice * l.qty;
  }
  const L = CORREIOS_LIMITS;
  const pkg: Package = {
    weight_kg: Math.round(grams) / 1000,
    length_cm: Math.max(L.minLength, Math.ceil(s.box.length_cm)),
    width_cm: Math.max(L.minWidth, Math.ceil(s.box.width_cm)),
    height_cm: Math.max(L.minHeight, Math.ceil(height)),
    insurance_value: Math.round(value * 100) / 100,
  };
  const sides = [pkg.length_cm, pkg.width_cm, pkg.height_cm];
  if (
    pkg.weight_kg > L.maxWeightKg ||
    sides.some((x) => x > L.maxSideCm) ||
    sides.reduce((a, b) => a + b, 0) > L.maxSumCm
  )
    return { ok: false, code: "too_big" };
  return { ok: true, pkg };
}
