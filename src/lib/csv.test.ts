import { describe, expect, it } from "vitest";
import { csvCell, parseCsv, parseNumberBR, toCsv } from "./csv";

describe("csv", () => {
  it("escapa aspas, separador e quebras de linha", () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });
  it("usa vírgula decimal e sim/não", () => {
    expect(csvCell(12.5)).toBe("12,5");
    expect(csvCell(true)).toBe("sim");
    expect(csvCell(null)).toBe("");
  });
  it("bloqueia injeção de fórmula do Excel", () => {
    for (const s of ["=1+1", "+55119", "-2", "@SOMA(A1)"]) expect(csvCell(s).startsWith("'")).toBe(true);
    expect(csvCell(-3)).toBe("-3");
  });
  it("gera BOM, cabeçalho e linhas", () => {
    const out = toCsv([{ a: "x", b: 1 }], [{ header: "A", value: (r) => r.a }, { header: "B", value: (r) => r.b }]);
    expect(out).toBe("﻿A;B\r\nx;1\r\n");
  });
  it("lê o que escreve (ida e volta)", () => {
    const rows = [{ n: 'Camisa "Home"; G', p: "=cmd" }];
    const text = toCsv(rows, [{ header: "n", value: (r) => r.n }, { header: "p", value: (r) => r.p }]);
    expect(parseCsv(text)).toEqual([["n", "p"], ['Camisa "Home"; G', "'=cmd"]]);
  });
  it("detecta vírgula como separador e ignora linhas vazias", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n3,4")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });
  it("converte números no formato brasileiro", () => {
    expect(parseNumberBR("1.234,56")).toBe(1234.56);
    expect(parseNumberBR("R$ 199,90")).toBe(199.9);
    expect(parseNumberBR("199.9")).toBe(199.9);
    expect(parseNumberBR("abc")).toBeNull();
    expect(parseNumberBR("")).toBeNull();
  });
});
