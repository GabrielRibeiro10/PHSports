// Client-side hardening for search/query inputs.
// - Strips control chars, angle brackets and other risky punctuation
// - Collapses whitespace, enforces a max length
// - Provides a lightweight sliding-window throttle to absorb accidental floods
//
// Note: product search runs entirely in-memory over the public catalog
// (no dynamic SQL), so this focuses on defensive input hygiene and UX
// throttling rather than backend rate limiting.

export const MAX_SEARCH_LEN = 60;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
// Disallow shell/HTML/SQL-ish chars that have no place in a product query
const DANGEROUS_CHARS = /[<>{}\[\]$`\\;|]/g;
const MULTI_WS = /\s+/g;

export function sanitizeSearch(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const cleaned = raw
    .replace(CONTROL_CHARS, " ")
    .replace(DANGEROUS_CHARS, " ")
    .replace(MULTI_WS, " ")
    .trim();
  return cleaned.slice(0, MAX_SEARCH_LEN);
}

export function isValidSearch(v: string): boolean {
  return v.length > 0 && v.length <= MAX_SEARCH_LEN;
}

// --- Sliding-window throttle ---------------------------------------------
// Keeps last N submission timestamps; if the window is full within WINDOW_MS
// we return the ms the caller should wait before trying again.
const submissions: number[] = [];
const MAX_IN_WINDOW = 12;
const WINDOW_MS = 10_000;

export function checkSearchRate(now: number = Date.now()): { ok: true } | { ok: false; retryInMs: number } {
  // Drop stale entries
  while (submissions.length && now - submissions[0] > WINDOW_MS) submissions.shift();
  if (submissions.length >= MAX_IN_WINDOW) {
    const retryInMs = WINDOW_MS - (now - submissions[0]);
    return { ok: false, retryInMs: Math.max(500, retryInMs) };
  }
  submissions.push(now);
  return { ok: true };
}
