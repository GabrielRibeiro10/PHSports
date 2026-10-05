import { describe, expect, it } from "vitest";
import { whatsappHref, buildCheckoutMessage, cartLines } from "@/lib/whatsapp";
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

const address = { cep: "11635160", street: "Rua A", number: "10", complement: "casa", district: "Centro", city: "Ilhabela", uf: "SP" };
const customer = { name: "Maria Silva", whatsapp: "(12) 99999-0000" };

describe("buildCheckoutMessage", () => {
  it("keeps malicious product data inert once encoded", () => {
    const msg = buildCheckoutMessage({
      lines: cartLines([{ slug: "evil", size: `<svg/onload=alert(1)>` as never, qty: 1 }], [evilProduct]),
      subtotal: 179.9,
      discount: 0,
      shipping: null,
      total: 179.9,
      customer,
      address,
    });
    const href = whatsappHref(msg);
    expect(href).not.toMatch(/[<>]/);
    expect(href).not.toContain("<script");
  });

  it("leva tudo o que a loja precisa para fechar a venda, no WhatsApp da loja", () => {
    const msg = buildCheckoutMessage({
      code: "PH-1042",
      lines: [
        { name: "Camisa Brasil", size: "M", qty: 2, price: 179.9 },
        { name: "Camisa Santos", size: "G", qty: 1, price: 179.9 },
      ],
      subtotal: 539.7,
      discount: 20,
      coupon: "BEMVINDO",
      shipping: null,
      total: 519.7,
      customer,
      address,
    });
    for (const part of [
      "Pedido PH-1042",
      "1. Camisa Brasil",
      "Tamanho M · 2 un.",
      "2. Camisa Santos",
      "Tamanho G · 1 un.",
      "Cupom BEMVINDO",
      "Frete: a combinar",
      "+ frete",
      "Nome: Maria Silva",
      "WhatsApp: (12) 99999-0000",
      "Rua A, 10 - casa",
      "Centro - Ilhabela/SP",
      "CEP 11635-160",
    ])
      expect(msg).toContain(part);
    expect(whatsappHref(msg).startsWith("https://wa.me/5512992319709?text=")).toBe(true);
  });

  it("sem número de pedido (banco não pronto) mantém cliente e endereço", () => {
    const msg = buildCheckoutMessage({ lines: [], subtotal: 0, discount: 0, coupon: "X", shipping: null, total: 0, customer, address });
    expect(msg).not.toContain("*Pedido");
    expect(msg).toContain("Cupom informado: X (a confirmar)");
    expect(msg).toContain("Nome: Maria Silva");
    expect(msg).toContain("CEP 11635-160");
  });
});
