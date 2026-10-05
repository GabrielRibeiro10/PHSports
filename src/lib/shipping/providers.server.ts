// Server-only: chamadas que usam credenciais. Nunca importar no navegador.
import type { Package } from "./package";
import type { ShippingEnvironment, ShippingOption } from "./types";

export type ProviderQuote =
  | { ok: true; options: ShippingOption[]; environment: ShippingEnvironment }
  | { ok: false; code: "no_service" | "provider_config" | "provider_error" | "cep_not_found"; detail?: string };

type Env = Record<string, string | undefined>;
type FetchLike = typeof fetch;

const TIMEOUT_MS = 8000;

async function fetchJson(f: FetchLike, url: string, init: RequestInit): Promise<{ status: number; body: unknown }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await f(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

const money = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};
const moneyDot = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};
const int = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

/* ───────────────────────────── Melhor Envio ───────────────────────────── */

export const MELHOR_ENVIO_HOSTS: Record<ShippingEnvironment, string> = {
  sandbox: "https://sandbox.melhorenvio.com.br",
  production: "https://melhorenvio.com.br",
};

/**
 * Cotação via Melhor Envio (modalidades dos Correios habilitadas na conta).
 * Env: MELHOR_ENVIO_TOKEN, MELHOR_ENVIO_ENV (sandbox|production), MELHOR_ENVIO_CONTACT_EMAIL,
 * MELHOR_ENVIO_SERVICES (ids; padrão "1,2" = Correios PAC e SEDEX).
 */
export async function quoteMelhorEnvio(
  input: { from: string; to: string; pkg: Package },
  env: Env,
  f: FetchLike = fetch,
): Promise<ProviderQuote> {
  const token = env.MELHOR_ENVIO_TOKEN?.trim();
  const environment: ShippingEnvironment = env.MELHOR_ENVIO_ENV === "production" ? "production" : "sandbox";
  const email = env.MELHOR_ENVIO_CONTACT_EMAIL?.trim();
  if (!token || !email) return { ok: false, code: "provider_config", detail: "MELHOR_ENVIO_TOKEN/CONTACT_EMAIL ausente" };
  const services = (env.MELHOR_ENVIO_SERVICES?.trim() || "1,2").replace(/[^\d,]/g, "");

  let res: { status: number; body: unknown };
  try {
    res = await fetchJson(f, `${MELHOR_ENVIO_HOSTS[environment]}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": `PH Sports (${email})`,
      },
      body: JSON.stringify({
        from: { postal_code: input.from },
        to: { postal_code: input.to },
        package: {
          height: input.pkg.height_cm,
          width: input.pkg.width_cm,
          length: input.pkg.length_cm,
          weight: input.pkg.weight_kg,
        },
        options: { insurance_value: input.pkg.insurance_value, receipt: false, own_hand: false },
        services,
      }),
    });
  } catch (e) {
    return { ok: false, code: "provider_error", detail: e instanceof Error ? e.message : "fetch" };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, code: "provider_config", detail: `HTTP ${res.status}` };
  if (res.status === 422) {
    const msg = JSON.stringify(res.body ?? "").toLowerCase();
    if (msg.includes("postal_code") || msg.includes("cep")) return { ok: false, code: "cep_not_found", detail: msg.slice(0, 200) };
    return { ok: false, code: "provider_error", detail: msg.slice(0, 200) };
  }
  if (res.status < 200 || res.status >= 300 || !Array.isArray(res.body))
    return { ok: false, code: "provider_error", detail: `HTTP ${res.status}` };

  const options: ShippingOption[] = [];
  for (const s of res.body as Record<string, unknown>[]) {
    if (!s || s.error) continue;
    const price = moneyDot(s.custom_price ?? s.price);
    const range = (s.custom_delivery_range ?? s.delivery_range) as { min?: unknown; max?: unknown } | undefined;
    const dmax = int(range?.max) ?? int(s.custom_delivery_time ?? s.delivery_time);
    const dmin = int(range?.min) ?? dmax;
    if (price == null || dmax == null || dmin == null) continue;
    const company = (s.company ?? {}) as { name?: unknown };
    options.push({
      key: `me:${String(s.id)}`,
      name: String(s.name ?? "").slice(0, 40) || "Correios",
      carrier: String(company.name ?? "Correios").slice(0, 40),
      price,
      days: { min: dmin, max: Math.max(dmin, dmax) },
    });
  }
  if (!options.length) return { ok: false, code: "no_service" };
  options.sort((a, b) => a.price - b.price);
  return { ok: true, options, environment };
}

/* ───────────────────────────── Correios (contrato) ───────────────────────────── */

export const CORREIOS_HOSTS: Record<ShippingEnvironment, string> = {
  sandbox: "https://apihom.correios.com.br",
  production: "https://api.correios.com.br",
};

const tokenCache = new Map<string, { token: string; exp: number }>();

/**
 * Cotação direta na API dos Correios (exige contrato + cartão de postagem).
 * Env: CORREIOS_USUARIO, CORREIOS_CODIGO_ACESSO, CORREIOS_CARTAO_POSTAGEM, CORREIOS_CONTRATO,
 * CORREIOS_DR, CORREIOS_ENV (sandbox|production), CORREIOS_SERVICOS (padrão "03298:PAC,03220:SEDEX").
 */
export async function quoteCorreios(
  input: { from: string; to: string; pkg: Package },
  env: Env,
  f: FetchLike = fetch,
): Promise<ProviderQuote> {
  const user = env.CORREIOS_USUARIO?.trim();
  const code = env.CORREIOS_CODIGO_ACESSO?.trim();
  const card = env.CORREIOS_CARTAO_POSTAGEM?.trim();
  const contract = env.CORREIOS_CONTRATO?.trim();
  const dr = env.CORREIOS_DR?.trim();
  const environment: ShippingEnvironment = env.CORREIOS_ENV === "production" ? "production" : "sandbox";
  if (!user || !code || !card || !contract || !dr)
    return { ok: false, code: "provider_config", detail: "credenciais dos Correios incompletas" };
  const host = CORREIOS_HOSTS[environment];
  const services = (env.CORREIOS_SERVICOS?.trim() || "03298:PAC,03220:SEDEX")
    .split(",")
    .map((p) => p.split(":").map((x) => x.trim()))
    .filter(([id]) => /^\d{5}$/.test(id ?? ""))
    .map(([id, name]) => ({ id: id!, name: (name || id)!.slice(0, 30) }));

  try {
    const ck = `${environment}:${user}:${card}`;
    let tk = tokenCache.get(ck);
    if (!tk || tk.exp < Date.now() + 60_000) {
      const auth = await fetchJson(f, `${host}/token/v1/autentica/cartaopostagem`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${user}:${code}`)}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ numero: card }),
      });
      const b = (auth.body ?? {}) as { token?: string; expiraEm?: string };
      if (auth.status === 401 || auth.status === 403 || !b.token)
        return { ok: false, code: "provider_config", detail: `auth HTTP ${auth.status}` };
      const exp = b.expiraEm ? Date.parse(b.expiraEm) : Date.now() + 30 * 60_000;
      tk = { token: b.token, exp: Number.isFinite(exp) ? exp : Date.now() + 30 * 60_000 };
      tokenCache.set(ck, tk);
    }
    const headers = { Authorization: `Bearer ${tk.token}`, Accept: "application/json" };
    const grams = Math.max(1, Math.round(input.pkg.weight_kg * 1000));
    const options: ShippingOption[] = [];
    let cepError = false;
    await Promise.all(
      services.map(async (svc) => {
        const q = new URLSearchParams({
          cepOrigem: input.from,
          cepDestino: input.to,
          psObjeto: String(grams),
          tpObjeto: "2",
          comprimento: String(input.pkg.length_cm),
          largura: String(input.pkg.width_cm),
          altura: String(input.pkg.height_cm),
          nuContrato: contract,
          nuDR: dr,
        });
        const [p, d] = await Promise.all([
          fetchJson(f, `${host}/preco/v1/nacional/${svc.id}?${q}`, { headers }),
          fetchJson(f, `${host}/prazo/v1/nacional/${svc.id}?cepOrigem=${input.from}&cepDestino=${input.to}`, { headers }),
        ]);
        const pb = (p.body ?? {}) as { pcFinal?: unknown; txErro?: unknown; msgs?: unknown };
        const db = (d.body ?? {}) as { prazoEntrega?: unknown; txErro?: unknown };
        const errText = JSON.stringify([pb.txErro, pb.msgs, db.txErro]).toLowerCase();
        if (errText.includes("cep")) cepError = true;
        const price = money(pb.pcFinal);
        const days = int(db.prazoEntrega);
        if (p.status !== 200 || d.status !== 200 || price == null || days == null || days === 0) return;
        options.push({ key: `correios:${svc.id}`, name: svc.name, carrier: "Correios", price, days: { min: days, max: days } });
      }),
    );
    if (!options.length) return { ok: false, code: cepError ? "cep_not_found" : "no_service" };
    options.sort((a, b) => a.price - b.price);
    return { ok: true, options, environment };
  } catch (e) {
    return { ok: false, code: "provider_error", detail: e instanceof Error ? e.message : "fetch" };
  }
}

/** Escolhe o provedor: Correios direto se SHIPPING_PROVIDER=correios; senão Melhor Envio. */
export function quoteWithProvider(input: { from: string; to: string; pkg: Package }, env: Env, f: FetchLike = fetch) {
  return env.SHIPPING_PROVIDER === "correios" ? quoteCorreios(input, env, f) : quoteMelhorEnvio(input, env, f);
}
