import { describe, expect, it } from "vitest";
import { whatsappHref, buildOrderMessage } from "@/lib/whatsapp";
import type { Product } from "@/lib/products";
import { XSS_TEXT_PAYLOADS, XSS_URL_PAYLOADS } from "@/test/xss-payloads";

const evilProduct: Product = {
  slug: "evil",
  name: `<script>alert(1)</script>`,
  club: `<img src=x onerror=alert(1)>`,
  image: "javascript:alert(1)",
  gallery: [],
  price: 179.9,
  oldPrice: 259.9,
  discount: 30,
  colors: [],
  category: "masculino",
};

describe("whatsappHref", () => {
  it.each([...XSS_TEXT_PAYLOADS, ...XSS_URL_PAYLOADS])("encodes %j into the query string", (payload) => {
    const href = whatsappHref(payload);
    expect(href.startsWith("https://wa.me/")).toBe(true);
    // Nothing raw survives: angle brackets, quotes and spaces are percent-encoded
    expect(href).not.toMatch(/[<>"\s]/);
    expect(href).not.toMatch(/[\u0000-\u001F\u007F]/);
  });

  it("never produces a javascript: href", () => {
    expect(whatsappHref("javascript:alert(1)").toLowerCase()).not.toMatch(/^javascript:/);
    expect(whatsappHref(null).startsWith("https://wa.me/")).toBe(true);
  });
});

describe("buildOrderMessage", () => {
  it("keeps malicious product data inert once encoded", () => {
    const msg = buildOrderMessage(
      [{ slug: "evil", size: `<svg/onload=alert(1)>`, qty: 1 }],
      179.9,
      [evilProduct],
    );
    const href = whatsappHref(msg);
    expect(href).not.toMatch(/[<>]/);
    expect(href).not.toContain("<script");
  });
});
