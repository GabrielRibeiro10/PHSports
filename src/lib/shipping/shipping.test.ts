import { describe, expect, it, vi } from "vitest";
import { buildPackage, parseSettings } from "./package";
import { quoteCorreios, quoteMelhorEnvio } from "./providers.server";
import { computeQuote, type QuoteDeps } from "./quote.server";
import { isValidCep, maskCep } from "./cep";
import { quoteSignature } from "./types";
import { createOrderCore, type OrderDeps, type OrderRecord } from "@/lib/orders.server";
import type { OrderInput } from "@/lib/orders.schema";

const SETTINGS = {
  origin_cep: "11630-000",
  prep_days: 2,
  box: { length_cm: 30, width_cm: 25, base_height_cm: 2, empty_weight_g: 100 },
  items: { masculino: { weight_g: 250, thickness_cm: 2 }, feminino: { weight_g: 200, thickness_cm: 1.5 } },
};
const S = parseSettings(SETTINGS)!;

const meResponse = [
  { id: 1, name: "PAC", price: "24.50", custom_price: "22.10", delivery_range: { min: 5, max: 7 }, custom_delivery_range: { min: 6, max: 8 }, company: { name: "Correios" } },
  { id: 2, name: "SEDEX", price: "41.90", custom_price: "39.80", delivery_time: 2, custom_delivery_time: 3, company: { name: "Correios" } },
  { id: 17, name: "Mini Envios", error: "Serviço indisponível para o trecho." },
];

function fakeFetch(handler: (url: string, init: RequestInit) => { status: number; body: unknown }) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const r = handler(String(url), init ?? {});
    return new Response(typeof r.body === "string" ? r.body : JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const ME_ENV = { MELHOR_ENVIO_TOKEN: "tok", MELHOR_ENVIO_CONTACT_EMAIL: "loja@x.com", MELHOR_ENVIO_ENV: "sandbox" };

describe("CEP", () => {
  it("máscara e validação", () => {
    expect(maskCep("01310100")).toBe("01310-100");
    expect(maskCep("0131")).toBe("0131");
    expect(isValidCep("01310-100")).toBe(true);
    expect(isValidCep("0131010")).toBe(false);
    expect(isValidCep("00000000")).toBe(false);
  });
});

describe("pacote", () => {
  it("3 camisas pesam e ocupam 3x (não 1x)", () => {
    const one = buildPackage([{ category: "masculino", qty: 1, unitPrice: 179.9 }], S);
    const three = buildPackage([{ category: "masculino", qty: 3, unitPrice: 179.9 }], S);
    if (!one.ok || !three.ok) throw new Error("pacote");
    expect(one.pkg.weight_kg).toBe(0.35);
    expect(three.pkg.weight_kg).toBe(0.85);
    expect(three.pkg.height_cm).toBe(8);
    expect(three.pkg.insurance_value).toBe(539.7);
  });
  it("mistura categorias", () => {
    const r = buildPackage(
      [
        { category: "masculino", qty: 1, unitPrice: 100 },
        { category: "feminino", qty: 2, unitPrice: 100 },
      ],
      S,
    );
    expect(r.ok && r.pkg.weight_kg).toBe(0.75);
  });
  it("categoria sem peso/medida → erro de configuração", () => {
    const r = buildPackage([{ category: "caneleiras", qty: 1, unitPrice: 50 }], S);
    expect(r).toEqual({ ok: false, code: "package_config", missing: ["caneleiras"] });
  });
  it("acima do limite dos Correios", () => {
    expect(buildPackage([{ category: "masculino", qty: 50, unitPrice: 100 }], S)).toMatchObject({ ok: false, code: "too_big" });
  });
  it("configuração incompleta não é completada com valores inventados", () => {
    expect(parseSettings({})).toBeNull();
    expect(parseSettings({ ...SETTINGS, origin_cep: "" })).toBeNull();
    expect(parseSettings({ ...SETTINGS, box: { ...SETTINGS.box, width_cm: 0 } })).toBeNull();
  });
});

describe("Melhor Envio", () => {
  const pkg = { weight_kg: 0.85, length_cm: 30, width_cm: 25, height_cm: 8, insurance_value: 539.7 };

  it("envia peso/medidas do pacote e usa o preço da conta (custom_price)", async () => {
    const f = fakeFetch(() => ({ status: 200, body: meResponse }));
    const r = await quoteMelhorEnvio({ from: "11630000", to: "01310100", pkg }, ME_ENV, f);
    expect(r).toEqual({
      ok: true,
      environment: "sandbox",
      options: [
        { key: "me:1", name: "PAC", carrier: "Correios", price: 22.1, days: { min: 6, max: 8 } },
        { key: "me:2", name: "SEDEX", carrier: "Correios", price: 39.8, days: { min: 3, max: 3 } },
      ],
    });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      from: { postal_code: "11630000" },
      to: { postal_code: "01310100" },
      package: { weight: 0.85, height: 8, width: 25, length: 30 },
      options: { insurance_value: 539.7 },
      services: "1,2",
    });
  });
  it("produção usa o host de produção", async () => {
    const f = fakeFetch(() => ({ status: 200, body: meResponse }));
    const r = await quoteMelhorEnvio({ from: "11630000", to: "01310100", pkg }, { ...ME_ENV, MELHOR_ENVIO_ENV: "production" }, f);
    expect(r.ok && r.environment).toBe("production");
    expect(f.mock.calls[0][0]).toBe("https://melhorenvio.com.br/api/v2/me/shipment/calculate");
  });
  it("sem token → configuração, sem chamar a API", async () => {
    const f = fakeFetch(() => ({ status: 200, body: meResponse }));
    expect(await quoteMelhorEnvio({ from: "a", to: "b", pkg }, {}, f)).toMatchObject({ ok: false, code: "provider_config" });
    expect(f).not.toHaveBeenCalled();
  });
  it.each([
    [401, "provider_config"],
    [500, "provider_error"],
  ])("HTTP %i → %s", async (status, code) => {
    const f = fakeFetch(() => ({ status, body: { message: "x" } }));
    expect(await quoteMelhorEnvio({ from: "a", to: "b", pkg }, ME_ENV, f)).toMatchObject({ ok: false, code });
  });
  it("422 de CEP → CEP não encontrado", async () => {
    const f = fakeFetch(() => ({ status: 422, body: { errors: { "to.postal_code": ["inválido"] } } }));
    expect(await quoteMelhorEnvio({ from: "a", to: "b", pkg }, ME_ENV, f)).toMatchObject({ ok: false, code: "cep_not_found" });
  });
  it("todas as modalidades com erro → sem atendimento", async () => {
    const f = fakeFetch(() => ({ status: 200, body: [{ id: 1, name: "PAC", error: "Trecho não atendido" }] }));
    expect(await quoteMelhorEnvio({ from: "a", to: "b", pkg }, ME_ENV, f)).toMatchObject({ ok: false, code: "no_service" });
  });
  it("queda de rede → erro de consulta (nunca valor zerado)", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("network");
    }) as unknown as typeof fetch;
    expect(await quoteMelhorEnvio({ from: "a", to: "b", pkg }, ME_ENV, f)).toMatchObject({ ok: false, code: "provider_error" });
  });
});

describe("Correios (contrato)", () => {
  const env = {
    SHIPPING_PROVIDER: "correios",
    CORREIOS_USUARIO: "u",
    CORREIOS_CODIGO_ACESSO: "c",
    CORREIOS_CARTAO_POSTAGEM: "0067599079",
    CORREIOS_CONTRATO: "9912208555",
    CORREIOS_DR: "20",
    CORREIOS_ENV: "sandbox",
  };
  it("autentica, consulta preço e prazo por serviço", async () => {
    const f = fakeFetch((url) => {
      if (url.includes("/token/")) return { status: 201, body: { token: "jwt", expiraEm: new Date(Date.now() + 3600e3).toISOString() } };
      if (url.includes("/preco/v1/nacional/03298")) return { status: 200, body: { pcFinal: "25,30" } };
      if (url.includes("/preco/v1/nacional/03220")) return { status: 200, body: { pcFinal: "1.045,90" } };
      if (url.includes("/prazo/v1/nacional/03298")) return { status: 200, body: { prazoEntrega: 7 } };
      return { status: 200, body: { prazoEntrega: 2 } };
    });
    const pkg = { weight_kg: 0.35, length_cm: 30, width_cm: 25, height_cm: 4, insurance_value: 179.9 };
    const r = await quoteCorreios({ from: "11630000", to: "01310100", pkg }, env, f);
    expect(r).toEqual({
      ok: true,
      environment: "sandbox",
      options: [
        { key: "correios:03298", name: "PAC", carrier: "Correios", price: 25.3, days: { min: 7, max: 7 } },
        { key: "correios:03220", name: "SEDEX", carrier: "Correios", price: 1045.9, days: { min: 2, max: 2 } },
      ],
    });
    const preco = f.mock.calls.map((c) => String(c[0])).find((u) => u.includes("/preco/v1/nacional/03298"))!;
    expect(preco).toContain("https://apihom.correios.com.br/");
    expect(preco).toContain("psObjeto=350");
    expect(preco).toContain("nuContrato=9912208555");
  });
  it("credenciais incompletas → configuração", async () => {
    expect(await quoteCorreios({ from: "a", to: "b", pkg: {} as never }, { CORREIOS_USUARIO: "u" })).toMatchObject({
      ok: false,
      code: "provider_config",
    });
  });
});

const PRODUCTS = [
  { id: "p1", slug: "flamengo", name: "Camisa Flamengo", category: "masculino" as const, price: 179.9, active: true },
  { id: "p2", slug: "brasil-fem", name: "Camisa Brasil Feminina", category: "feminino" as const, price: 159.9, active: true },
];

function quoteDeps(over: Partial<QuoteDeps> = {}, body: unknown = meResponse) {
  const f = fakeFetch(() => ({ status: 200, body }));
  const deps: QuoteDeps = {
    env: ME_ENV,
    fetch: f,
    loadSettings: async () => SETTINGS,
    loadProducts: async (slugs) => PRODUCTS.filter((p) => slugs.includes(p.slug)),
    lookupCep: async () => ({ city: "São Paulo", uf: "SP" }),
    ...over,
  };
  return { deps, f };
}

describe("cotação (servidor)", () => {
  it("CEP inválido não consulta a API", async () => {
    const { deps, f } = quoteDeps();
    expect(await computeQuote({ cep: "123", items: [{ slug: "flamengo", qty: 1 }] }, deps)).toMatchObject({ code: "invalid_cep" });
    expect(f).not.toHaveBeenCalled();
  });
  it("CEP inexistente", async () => {
    const { deps } = quoteDeps({ lookupCep: async () => "not_found" });
    expect(await computeQuote({ cep: "99999-998", items: [{ slug: "flamengo", qty: 1 }] }, deps)).toMatchObject({
      code: "cep_not_found",
    });
  });
  it("devolve opções, prazo de preparação, cidade e ambiente", async () => {
    const { deps } = quoteDeps();
    const r = await computeQuote({ cep: "22041-001", items: [{ slug: "flamengo", qty: 1 }] }, deps);
    expect(r).toMatchObject({ ok: true, cep: "22041001", city: "São Paulo", prepDays: 2, environment: "sandbox" });
    expect(r.ok && r.options.map((o) => o.name)).toEqual(["PAC", "SEDEX"]);
  });
  it("quantidade diferente → nova consulta com o peso total do carrinho", async () => {
    const { deps, f } = quoteDeps();
    await computeQuote({ cep: "30130-010", items: [{ slug: "flamengo", qty: 1 }] }, deps);
    await computeQuote({ cep: "30130-010", items: [{ slug: "flamengo", qty: 1 }, { slug: "brasil-fem", qty: 2 }] }, deps);
    expect(f).toHaveBeenCalledTimes(2);
    expect(JSON.parse(f.mock.calls[1][1].body).package.weight).toBe(0.75);
    // mesma consulta de novo → cache, sem nova chamada
    await computeQuote({ cep: "30130-010", items: [{ slug: "flamengo", qty: 1 }] }, deps);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("mesmo produto em 2 tamanhos soma no peso", async () => {
    const { deps, f } = quoteDeps();
    await computeQuote({ cep: "40020-000", items: [{ slug: "flamengo", qty: 1 }, { slug: "flamengo", qty: 2 }] }, deps);
    expect(JSON.parse(f.mock.calls[0][1].body).package.weight).toBe(0.85);
  });
  it("loja sem configuração de pacote → erro claro", async () => {
    const { deps, f } = quoteDeps({ loadSettings: async () => ({}) });
    expect(await computeQuote({ cep: "50010-000", items: [{ slug: "flamengo", qty: 1 }] }, deps)).toMatchObject({
      code: "package_config",
    });
    expect(f).not.toHaveBeenCalled();
  });
  it("falha da API → erro (sem valores inventados)", async () => {
    const f = fakeFetch(() => ({ status: 503, body: "down" }));
    const { deps } = quoteDeps({ fetch: f });
    expect(await computeQuote({ cep: "60010-000", items: [{ slug: "flamengo", qty: 1 }] }, deps)).toMatchObject({
      ok: false,
      code: "provider_error",
    });
  });
  it("assinatura muda com CEP, produto ou quantidade", () => {
    const a = quoteSignature("01310100", [{ slug: "x", qty: 1 }]);
    expect(quoteSignature("01310100", [{ slug: "x", qty: 2 }])).not.toBe(a);
    expect(quoteSignature("01310101", [{ slug: "x", qty: 1 }])).not.toBe(a);
    expect(quoteSignature("01310100", [{ slug: "x", qty: 1 }])).toBe(a);
  });
});

describe("pedido (servidor)", () => {
  const base: OrderInput = {
    requestId: "req-0001-abcdef-123456",
    items: [
      { slug: "flamengo", size: "M", qty: 2 },
      { slug: "brasil-fem", size: "P", qty: 1 },
    ],
    shipping: { cep: "70040-010", key: "me:1", price: 22.1 },
    customer: { name: "Maria Silva", whatsapp: "(12) 99999-0000" },
    address: { cep: "70040010", street: "Rua A", number: "10", complement: "", district: "Centro", city: "Brasília", uf: "DF" },
  };
  function orderDeps(over: Partial<OrderDeps> = {}) {
    const { deps, f } = quoteDeps();
    const saved: { order?: OrderRecord; items?: unknown[]; keys: string[]; redeemed: number } = { keys: [], redeemed: 0 };
    const byKey = new Map<string, string>();
    const d: OrderDeps = {
      ...deps,
      loadProducts: async (slugs) => PRODUCTS.filter((p) => slugs.includes(p.slug)).map((p) => ({ ...p, sizes: null })),
      loadStock: async () => [],
      loadCoupon: async () => null,
      redeemCoupon: async () => {
        saved.redeemed++;
        return true;
      },
      saveOrder: async (key, order, items) => {
        saved.keys.push(key);
        if (byKey.has(key)) return { code: byKey.get(key)!, created: false };
        byKey.set(key, `PH-${byKey.size + 1}`);
        saved.order = order;
        saved.items = items;
        return { code: byKey.get(key)!, created: true };
      },
      storeWhatsapp: async () => "5512991112222",
      ...over,
    };
    return { d, saved, f };
  }

  it("frete escolhido chega ao pedido e ao total (preços do banco) + WhatsApp configurado", async () => {
    const { d, saved } = orderDeps();
    const r = await createOrderCore(base, d);
    expect(r).toMatchObject({ ok: true, code: "PH-1", created: true, subtotal: 519.7, discount: 0, total: 541.8, whatsapp: "5512991112222" });
    expect(saved.order).toMatchObject({
      shipping: 22.1,
      total: 541.8,
      shipping_status: "cotado",
      shipping_service: "PAC",
      shipping_days_min: 6,
      shipping_days_max: 8,
      shipping_prep_days: 2,
      ship_cep: "70040010",
      ship_city: "Brasília",
      customer_whatsapp: "12999990000",
    });
    expect(saved.items).toEqual([
      { product_id: "p1", product_name: "Camisa Flamengo", size: "M", quantity: 2, unit_price: 179.9 },
      { product_id: "p2", product_name: "Camisa Brasil Feminina", size: "P", quantity: 1, unit_price: 159.9 },
    ]);
  });
  it("sem frete escolhido → pedido com frete pendente (a combinar), nunca grátis", async () => {
    const { d, saved, f } = orderDeps();
    const r = await createOrderCore({ ...base, shipping: null }, d);
    expect(r).toMatchObject({ ok: true, total: 519.7, shipping: null });
    expect(saved.order).toMatchObject({ shipping_status: "pendente", shipping: 0, shipping_service: "" });
    expect(f).not.toHaveBeenCalled();
  });
  it("mesma solicitação repetida devolve o mesmo pedido e não conta o cupom de novo", async () => {
    const coupon = {
      code: "PH10", discount_type: "percent", discount_value: 10, starts_at: null, expires_at: null,
      max_uses: 0, used_count: 0, min_order_value: 0, active: true,
    };
    const { d, saved } = orderDeps({ loadCoupon: async () => coupon });
    const a = await createOrderCore({ ...base, coupon: "ph10" }, d);
    const b = await createOrderCore({ ...base, coupon: "ph10" }, d);
    expect(a).toMatchObject({ ok: true, code: "PH-1", created: true, discount: 51.97, total: 489.83 });
    expect(b).toMatchObject({ ok: true, code: "PH-1", created: false });
    expect(saved.redeemed).toBe(1);
  });
  it("tamanho que o produto não tem", async () => {
    const { d } = orderDeps({ loadProducts: async (s) => PRODUCTS.filter((p) => s.includes(p.slug)).map((p) => ({ ...p, sizes: ["P", "M"] })) });
    expect(await createOrderCore({ ...base, items: [{ slug: "flamengo", size: "XG", qty: 1 }] }, d)).toMatchObject({ code: "size_unavailable" });
  });
  it("estoque controlado: esgotado ou insuficiente bloqueia; produto sem controle passa", async () => {
    const stock = [
      { product_id: "p1", size: "M", quantity: 1 },
      { product_id: "p1", size: "G", quantity: 0 },
    ];
    const { d } = orderDeps({ loadStock: async () => stock });
    expect(await createOrderCore({ ...base, shipping: null }, d)).toMatchObject({ code: "out_of_stock", message: expect.stringContaining("só temos 1") });
    expect(
      await createOrderCore({ ...base, shipping: null, items: [{ slug: "flamengo", size: "G", qty: 1 }] }, d),
    ).toMatchObject({ code: "out_of_stock", message: expect.stringContaining("esgotado") });
    expect(
      await createOrderCore({ ...base, requestId: "req-0002-abcdef-123456", shipping: null, items: [{ slug: "brasil-fem", size: "P", qty: 3 }] }, d),
    ).toMatchObject({ ok: true });
  });
  it("CEP do endereço diferente do CEP cotado → bloqueia", async () => {
    const { d, saved } = orderDeps();
    expect(await createOrderCore({ ...base, address: { ...base.address, cep: "70040-011" } }, d)).toMatchObject({ code: "address_mismatch" });
    expect(saved.order).toBeUndefined();
  });
  it("valor de frete adulterado/desatualizado → pede confirmação", async () => {
    const { d, saved } = orderDeps();
    expect(await createOrderCore({ ...base, shipping: { ...base.shipping!, price: 0 } }, d)).toMatchObject({ code: "shipping_changed" });
    expect(saved.order).toBeUndefined();
  });
  it("serviço que não existe mais para o endereço", async () => {
    const { d } = orderDeps();
    expect(await createOrderCore({ ...base, shipping: { ...base.shipping!, key: "me:99" } }, d)).toMatchObject({ code: "shipping_unavailable" });
  });
  it("cotação escolhida que falha agora → não finaliza com frete zerado", async () => {
    const f = fakeFetch(() => ({ status: 500, body: "x" }));
    const { d, saved } = orderDeps({ fetch: f });
    const r = await createOrderCore(
      { ...base, address: { ...base.address, cep: "70040020" }, shipping: { ...base.shipping!, cep: "70040020" } },
      d,
    );
    expect(r).toMatchObject({ ok: false, code: "quote_failed" });
    expect(saved.order).toBeUndefined();
  });
  it("produto inativo/inexistente", async () => {
    const { d } = orderDeps();
    expect(await createOrderCore({ ...base, items: [{ slug: "fake", size: "M", qty: 1 }] }, d)).toMatchObject({ code: "product_unavailable" });
  });
  it("falha ao salvar → erro claro (pode tentar de novo)", async () => {
    const { d } = orderDeps({ saveOrder: async () => null });
    expect(await createOrderCore(base, d)).toMatchObject({ ok: false, code: "save_failed" });
  });
});
