import { describe, expect, it } from "vitest";
import { delta, fillDays, topProducts } from "./insights";

describe("insights", () => {
  it("fillDays devolve um item por dia, com zero nos dias sem venda", () => {
    const today = new Date(2026, 9, 8); // 08/10/2026
    const out = fillDays([{ day: "2026-10-07", total: 150 }, { day: "2026-10-08", total: 50 }], 3, today);
    expect(out.map((d) => d.day)).toEqual(["2026-10-06", "2026-10-07", "2026-10-08"]);
    expect(out.map((d) => d.total)).toEqual([0, 150, 50]);
    expect(out[2].label).toBe("08/10");
  });
  it("delta calcula variação e evita divisão por zero", () => {
    expect(delta(150, 100)).toBe(50);
    expect(delta(50, 100)).toBe(-50);
    expect(delta(10, 0)).toBeNull();
    expect(delta(0, 100)).toBe(-100);
  });
  it("topProducts agrupa por nome e ordena por quantidade", () => {
    const top = topProducts([
      { product_name: "A", quantity: 1, unit_price: 100 },
      { product_name: "B", quantity: 3, unit_price: 50 },
      { product_name: "A", quantity: 1, unit_price: 100 },
    ]);
    expect(top[0]).toEqual({ name: "B", qty: 3, revenue: 150 });
    expect(top[1]).toEqual({ name: "A", qty: 2, revenue: 200 });
  });
});
