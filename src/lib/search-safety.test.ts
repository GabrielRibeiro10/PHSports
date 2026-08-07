import { describe, expect, it } from "vitest";
import { MAX_SEARCH_LEN, isValidSearch, sanitizeSearch } from "@/lib/search-safety";
import { XSS_TEXT_PAYLOADS } from "@/test/xss-payloads";

describe("sanitizeSearch", () => {
  it.each(XSS_TEXT_PAYLOADS)("strips markup from %j", (payload) => {
    const out = sanitizeSearch(payload);
    expect(out).not.toMatch(/[<>{}[\]$`\\;|]/);
    expect(out).not.toMatch(/[\u0000-\u001F\u007F]/);
    expect(out.length).toBeLessThanOrEqual(MAX_SEARCH_LEN);
  });

  it("keeps normal queries intact", () => {
    expect(sanitizeSearch("  camisa   flamengo ")).toBe("camisa flamengo");
    expect(isValidSearch(sanitizeSearch("retro"))).toBe(true);
    expect(isValidSearch(sanitizeSearch("<script>"))).toBe(false);
  });
});
