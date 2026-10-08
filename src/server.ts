import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { GA4_ID, META_PIXEL_ID } from "./lib/analytics";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// --- Security headers -----------------------------------------------------
// Applied to every response served by the Worker. CSP allows the current
// bundling model (TanStack Start ships inline hydration scripts and Tailwind
// utility styles are inlined by Vite in production) while restricting all
// external origins to Supabase + a small set of trusted CDNs used by images.
// Mesmo banco que o navegador usa (VITE_SUPABASE_URL do build).
const SUPABASE_HOST = new URL(
  import.meta.env.VITE_SUPABASE_URL || "https://jqdvpdnaeuzjdbmxzyxc.supabase.co",
).origin;
const SUPABASE_WS = SUPABASE_HOST.replace(/^https:/, "wss:");

// Rastreamento só é liberado quando o ID está preenchido em src/lib/analytics.ts.
const ANALYTICS_SCRIPT = [
  GA4_ID && "https://*.googletagmanager.com",
  META_PIXEL_ID && "https://connect.facebook.net",
].filter(Boolean);
const ANALYTICS_CONNECT = [
  GA4_ID && "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
  META_PIXEL_ID && "https://www.facebook.com https://connect.facebook.net",
].filter(Boolean);

const CSP = [
  "default-src 'self'",
  `img-src 'self' data: blob: https: ${SUPABASE_HOST}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // SSR hydration ships inline module scripts; keep 'unsafe-inline' for now.
  ["script-src 'self' 'unsafe-inline' 'unsafe-eval'", ...ANALYTICS_SCRIPT].join(" "),
  // ViaCEP: o checkout preenche rua/bairro/cidade pelo CEP.
  [`connect-src 'self' ${SUPABASE_HOST} ${SUPABASE_WS} https://viacep.com.br`, ...ANALYTICS_CONNECT].join(" "),
  "frame-ancestors 'none'",
  "form-action 'self' https://wa.me https://api.whatsapp.com",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
};

function withSecurityHeaders(response: Response): Response {
  // Response headers may be immutable; clone if needed.
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  // Never cache authenticated admin surface — belt-and-suspenders for /admin.
  const url = headers.get("x-original-url") ?? "";
  if (url.includes("/admin")) {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return withSecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
