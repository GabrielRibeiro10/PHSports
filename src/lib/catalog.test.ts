import { describe, expect, it, vi } from "vitest";

// The catalog module imports the browser Supabase client; stub it so the
// sanitization mappers can be tested in isolation.
vi.mock("@/integrations/supabase/client", () => ({ supabase: { channel: () => ({}) } }));

import { mapProductRow, mapCategoryRow } from "@/lib/catalog";
import { XSS_TEXT_PAYLOADS, XSS_URL_PAYLOADS } from "@/test/xss-payloads";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "1",
    slug: "camisa",
    name: "Camisa",
    club: "Clube",
    image_url: "https://cdn.test/a.png",
    image_url_2: null,
    image_url_3: null,
    image_url_4: null,
    price: 179.9,
    old_price: 259.9,
    discount: 30,
    colors: [],
    category: "masculino",
    sizes: null,
    description: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("mapProductRow (untrusted DB content)", () => {
  it.each(XSS_TEXT_PAYLOADS)("strips markup from text fields for %j", (payload) => {
    const p = mapProductRow(
      row({ name: payload, club: payload, slug: payload, description: payload, colors: [payload], sizes: [payload] }),
    );
    for (const value of [p.name, p.club, p.slug, p.description ?? "", ...p.colors, ...(p.sizes ?? [])]) {
      expect(value).not.toMatch(/[<>]/);
      expect(value).not.toMatch(/[\u0000-\u001F\u007F]/);
    }
  });

  it.each(XSS_URL_PAYLOADS)("drops unsafe image url %j", (payload) => {
    const p = mapProductRow(row({ image_url: payload, image_url_2: payload }));
    expect(p.image).toBe("");
    expect(p.gallery).toHaveLength(0);
  });
});

describe("mapCategoryRow (untrusted DB content)", () => {
  it.each(XSS_TEXT_PAYLOADS)("sanitizes %j", (payload) => {
    const c = mapCategoryRow(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "masculino", slug: payload, name: payload, emoji: payload, image_url: "javascript:alert(1)", tagline: payload } as any,
    );
    for (const value of [c.slug, c.name, c.emoji, c.tagline]) {
      expect(value).not.toMatch(/[<>]/);
    }
    expect(c.image).toBe("");
  });
});
