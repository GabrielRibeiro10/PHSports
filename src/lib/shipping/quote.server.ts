// Server-only: monta o pacote com dados do banco e consulta o provedor de frete.
import type { CategoryId } from "@/lib/products";
import { buildPackage, parseSettings } from "./package";
import { quoteWithProvider } from "./providers.server";
import { cepDigits, isValidCep } from "./cep";
import { QUOTE_MESSAGES, quoteSignature, type QuoteItem, type QuoteResult } from "./types";

export type DbProduct = { id: string; slug: string; name: string; category: CategoryId; price: number; active: boolean };
type Env = Record<string, string | undefined>;

export type QuoteDeps = {
  env: Env;
  fetch?: typeof fetch;
  loadSettings: () => Promise<unknown>;
  loadProducts: (slugs: string[]) => Promise<DbProduct[]>;
  /** endereço do CEP (ViaCEP); "not_found" se o CEP não existe; null se a consulta falhar */
  lookupCep: (cep: string) => Promise<{ city: string; uf: string } | "not_found" | null>;
};

export const MAX_LINES = 40;
export const MAX_QTY = 50;

const fail = (code: Exclude<QuoteResult, { ok: true }>["code"]): QuoteResult => ({
  ok: false,
  code,
  message: QUOTE_MESSAGES[code],
});

/** Junta linhas repetidas (mesmo produto em tamanhos diferentes) e limita quantidades. */
export function normalizeItems(items: QuoteItem[]): QuoteItem[] {
  const map = new Map<string, number>();
  for (const i of items.slice(0, MAX_LINES)) {
    const slug = String(i.slug ?? "").slice(0, 120);
    const qty = Math.floor(Number(i.qty));
    if (!slug || !Number.isFinite(qty) || qty < 1) continue;
    map.set(slug, Math.min(MAX_QTY, (map.get(slug) ?? 0) + qty));
  }
  return [...map].map(([slug, qty]) => ({ slug, qty }));
}

const cache = new Map<string, { at: number; result: QuoteResult }>();
const CACHE_MS = 10 * 60_000;

/** `fresh`: ignora o cache (usado na finalização do pedido, que sempre confere o valor atual no provedor). */
export async function computeQuote(
  input: { cep: string; items: QuoteItem[] },
  deps: QuoteDeps,
  opts: { fresh?: boolean } = {},
): Promise<QuoteResult> {
  const cep = cepDigits(input.cep);
  if (!isValidCep(cep)) return fail("invalid_cep");
  const items = normalizeItems(input.items);
  if (!items.length) return fail("empty_cart");

  const signature = quoteSignature(cep, items);
  const settings = parseSettings(await deps.loadSettings());
  if (!settings) return fail("package_config");
  // Cache por carrinho + configuração: mudar peso/medidas no painel gera cotação nova na hora.
  const cacheKey = `${signature}#${JSON.stringify(settings)}`;
  const hit = cache.get(cacheKey);
  if (!opts.fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.result;

  const products = await deps.loadProducts(items.map((i) => i.slug));
  const bySlug = new Map(products.filter((p) => p.active).map((p) => [p.slug, p]));
  if (items.some((i) => !bySlug.has(i.slug))) return fail("empty_cart");

  const built = buildPackage(
    items.map((i) => {
      const p = bySlug.get(i.slug)!;
      return { category: p.category, qty: i.qty, unitPrice: Number(p.price) };
    }),
    settings,
  );
  if (!built.ok) return fail(built.code);

  const place = await deps.lookupCep(cep);
  if (place === "not_found") return fail("cep_not_found");

  const quote = await quoteWithProvider({ from: settings.origin_cep, to: cep, pkg: built.pkg }, deps.env, deps.fetch);
  if (!quote.ok) {
    if (quote.detail) console.warn(`[frete] ${quote.code}: ${quote.detail}`);
    return fail(quote.code);
  }
  const result: QuoteResult = {
    ok: true,
    cep,
    city: place?.city,
    uf: place?.uf,
    options: quote.options,
    prepDays: settings.prep_days,
    environment: quote.environment,
    signature,
  };
  cache.set(cacheKey, { at: Date.now(), result });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return result;
}

/** Dependências reais (Supabase com service role + ViaCEP + variáveis de ambiente). */
export async function serverQuoteDeps(): Promise<QuoteDeps> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return {
    env: process.env as Env,
    loadSettings: async () => {
      const { data } = await supabaseAdmin.from("store_settings").select("value").eq("key", "shipping").maybeSingle();
      return data?.value ?? null;
    },
    loadProducts: async (slugs) => {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, slug, name, category, price, active")
        .in("slug", slugs);
      if (error) throw error;
      return (data ?? []).map((p: Omit<DbProduct, "price"> & { price: number | string }) => ({
        ...p,
        price: Number(p.price),
      }));
    },
    lookupCep: async (cep) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: ctrl.signal });
        if (res.status === 400) return "not_found";
        if (!res.ok) return null;
        const b = (await res.json()) as { erro?: unknown; localidade?: string; uf?: string };
        if (b.erro) return "not_found";
        return { city: String(b.localidade ?? "").slice(0, 60), uf: String(b.uf ?? "").slice(0, 2) };
      } catch {
        return null; // ViaCEP fora do ar não impede a cotação
      } finally {
        clearTimeout(t);
      }
    },
  };
}
