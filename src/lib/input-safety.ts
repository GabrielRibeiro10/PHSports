// Shared input hardening helpers used across forms and query surfaces.
// Focused on defensive normalization: strip control chars, collapse whitespace,
// enforce length caps and drop obviously dangerous punctuation before values
// reach any renderer, URL builder or backend call.

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const HTML_ANGLE = /[<>]/g;
const MULTI_WS = /\s+/g;

/** Strip control chars, collapse whitespace, cap length. Safe for any text. */
export function sanitizeText(raw: unknown, maxLen = 500): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(CONTROL_CHARS, " ")
    .replace(HTML_ANGLE, " ")
    .replace(MULTI_WS, " ")
    .trim()
    .slice(0, maxLen);
}

/** Basic email normalizer + shape check. */
export function sanitizeEmail(raw: unknown): string {
  const cleaned = sanitizeText(raw, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : "";
}

/** Ensure a redirect target is a same-origin path only. */
export function safeRedirectPath(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw.slice(0, 512);
}

// --- URL hardening (XSS via href/src) ------------------------------------
// Blocks javascript:, vbscript:, data: (except images) and other exotic
// schemes that can execute script when placed in href/src attributes.

const SAFE_IMAGE_DATA = /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);base64,[a-z0-9+/=\s]+$/i;

function normalizeScheme(raw: string): string {
  // Strip control chars/whitespace attackers use to smuggle "java\tscript:"
  return raw.replace(CONTROL_CHARS, "").replace(/\s/g, "").toLowerCase();
}

/**
 * Sanitize a URL for use in an `href`. Allows http(s), mailto, tel and
 * same-origin relative paths. Returns `undefined` when unsafe.
 */
export function safeUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim().slice(0, 2048);
  if (!value) return undefined;
  const probe = normalizeScheme(value);
  if (/^(javascript|vbscript|data|blob|file|about):/i.test(probe)) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("#")) return value;
  if (/^(https?|mailto|tel):/i.test(probe)) return value;
  return undefined;
}

/**
 * Sanitize a URL for use in an `<img src>`. Same rules as safeUrl but also
 * accepts base64 image data URLs and blob: previews (admin upload preview).
 */
export function safeImageUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim().slice(0, 5_000_000);
  if (!value) return undefined;
  if (value.startsWith("blob:")) return value;
  if (SAFE_IMAGE_DATA.test(value)) return value;
  const probe = normalizeScheme(value);
  if (/^(javascript|vbscript|data|file|about):/i.test(probe)) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (/^https?:/i.test(probe)) return value;
  return undefined;
}

/** CSS color/token allowlist for any value interpolated into a <style> tag. */
export function safeCssColor(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().slice(0, 64);
  return /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|oklch|var)\([a-z0-9%.,\s\-_]*\)|[a-z]{3,20})$/i.test(v)
    ? v
    : undefined;
}


// --- Progressive backoff (client-side, e.g. admin login) -----------------
// Persists across reloads so a page refresh doesn't reset the counter.
type Attempt = { count: number; blockedUntil: number };

const STORAGE_PREFIX = "ph_ratelimit:";

function readAttempt(key: string): Attempt {
  if (typeof window === "undefined") return { count: 0, blockedUntil: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return { count: 0, blockedUntil: 0 };
    const parsed = JSON.parse(raw) as Attempt;
    return { count: Number(parsed.count) || 0, blockedUntil: Number(parsed.blockedUntil) || 0 };
  } catch {
    return { count: 0, blockedUntil: 0 };
  }
}

function writeAttempt(key: string, value: Attempt) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export function checkBackoff(key: string, now = Date.now()): { ok: true } | { ok: false; retryInMs: number } {
  const state = readAttempt(key);
  if (state.blockedUntil > now) return { ok: false, retryInMs: state.blockedUntil - now };
  return { ok: true };
}

/** Record a failed attempt; escalates block duration progressively. */
export function recordFailure(key: string, now = Date.now()): { blockedForMs: number } {
  const state = readAttempt(key);
  const nextCount = state.count + 1;
  // 3 attempts free, then 5s, 15s, 30s, 60s, 120s, cap 300s.
  const schedule = [0, 0, 0, 5_000, 15_000, 30_000, 60_000, 120_000, 300_000];
  const blockedForMs = schedule[Math.min(nextCount, schedule.length - 1)];
  writeAttempt(key, { count: nextCount, blockedUntil: blockedForMs ? now + blockedForMs : 0 });
  return { blockedForMs };
}

export function resetBackoff(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* ignore */
  }
}
