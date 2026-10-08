import { describe, expect, it } from "vitest";
import { adjustPrice, parseProductCsv, productsToCsv, uniqueSlug } from "./productBulk";
import type { AdminProductRow } from "@/lib/adminCatalog";

const existing = [{ id: "1", slug: "camisa-a", name: "Camisa A", club: "A", category: "masculino", price: 200, old_price: 250, active: true, featured: false, sizes: ["P", "M"] }] as unknown as AdminProductRow[];

describe("adjustPrice", () => {
  it("aplica percentual e valor fixo com 2 casas", () => {
    expect(adjustPrice(200, { mode: "percent", value: 10 })).toBe(220);
    expect(adjustPrice(199.9, { mode: "percent", value: -15 })).toBe(169.92);
    expect(adjustPrice(100, { mode: "fixed", value: 5.5 })).toBe(105.5);
  });
  it("nunca fica abaixo de R$ 1 e recusa valores inválidos ou absurdos", () => {
    expect(adjustPrice(10, { mode: "percent", value: -100 })).toBe(1);
    expect(() => adjustPrice(10, { mode: "fixed", value: Number.NaN })).toThrow();
    expect(() => adjustPrice(90000, { mode: "percent", value: 100 })).toThrow();
  });
});

describe("uniqueSlug", () => {
  it("acrescenta número quando já existe", () => {
    expect(uniqueSlug("Camisa Nova", new Set())).toBe("camisa-nova");
    expect(uniqueSlug("camisa-a-copia", new Set(["camisa-a-copia"]))).toBe("camisa-a-copia-2");
  });
});

describe("parseProductCsv", () => {
  it("atualiza por slug e cria produto novo completo", () => {
    const csv = "slug;nome;clube;categoria;preco;preco_antigo;visivel;tamanhos\ncamisa-a;;;;219,90;;nao;\ncamisa-b;Camisa B;Time B;Retrô;149,9;199,9;sim;p m g";
    const plan = parseProductCsv(csv, existing);
    expect(plan.errors).toEqual([]);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0]).toMatchObject({ id: "1", price: 219.9, active: false });
    expect(plan.creates[0]).toMatchObject({ slug: "camisa-b", category: "retro", price: 149.9, old_price: 199.9, sizes: ["P", "M", "G"] });
  });
  it("aponta a linha de cada erro e não importa nada inválido", () => {
    const csv = "slug;nome;clube;categoria;preco\nx;X;Y;Inexistente;10\ncamisa-a;;;;abc\nnovo;Novo;;Masculino;50\ncamisa-a;;;;100";
    const plan = parseProductCsv(csv, existing);
    expect(plan.errors.map((e) => e.line)).toEqual([2, 3, 4, 5]);
    expect(plan.creates).toHaveLength(0);
    expect(plan.updates).toHaveLength(0);
  });
  it("recusa planilha sem cabeçalho útil, vazia ou grande demais", () => {
    expect(parseProductCsv("a;b\n1;2", existing).errors[0].message).toContain("slug");
    expect(parseProductCsv("slug", existing).errors).toHaveLength(1);
    const big = `slug;nome\n${Array.from({ length: 501 }, (_, i) => `p${i};P${i}`).join("\n")}`;
    expect(parseProductCsv(big, existing).errors[0].message).toContain("500");
  });
  it("preço abaixo de R$ 1 é recusado", () => {
    expect(parseProductCsv("slug;preco\ncamisa-a;0,5", existing).errors).toHaveLength(1);
  });
  it("exporta e reimporta sem perder nada (ida e volta)", () => {
    const plan = parseProductCsv(productsToCsv(existing), existing);
    expect(plan.errors).toEqual([]);
    expect(plan.updates[0]).toMatchObject({ price: 200, old_price: 250, active: true, sizes: ["P", "M"] });
  });
});
