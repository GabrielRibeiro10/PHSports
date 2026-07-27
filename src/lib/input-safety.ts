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
