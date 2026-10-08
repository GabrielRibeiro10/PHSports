import { describe, expect, it } from "vitest";
import { buildBuyers, filterBuyers, phoneKey } from "./buyers";
import type { OrderRow } from "@/lib/adminOrders";

const o = (over: Partial<OrderRow>) => ({ payment_status: "confirmado", fulfillment_status: "entregue", customer_name: "Ana", customer_whatsapp: "11 99999-1111", total: 100, created_at: "2026-10-01T10:00:00Z", payment_confirmed_at: null, ship_city: "Ilhabela", ...over }) as unknown as OrderRow;
const now = new Date("2026-10-08T12:00:00Z");

describe("buyers", () => {
  it("normaliza telefones com e sem +55", () => {
    expect(phoneKey("+55 (11) 99999-1111")).toBe("11999991111");
    expect(phoneKey("11999991111")).toBe("11999991111");
  });
  it("agrupa pelo WhatsApp e soma só pedidos pagos e não cancelados", () => {
    const list = buildBuyers([
      o({ total: 100 }),
      o({ customer_whatsapp: "+5511999991111", total: 50, created_at: "2026-10-05T10:00:00Z" }),
      o({ payment_status: "pendente", total: 999 }),
      o({ fulfillment_status: "cancelado", total: 888 }),
      o({ customer_whatsapp: "21 98888-2222", customer_name: "Bia", total: 70 }),
    ], now);
    expect(list).toHaveLength(2);
    const ana = list.find((b) => b.name === "Ana")!;
    expect(ana.orders).toBe(2);
    expect(ana.spent).toBe(150);
    expect(ana.daysSince).toBe(3);
  });
  it("filtra recompra e clientes inativos", () => {
    const list = buildBuyers([
      o({ created_at: "2026-10-01T10:00:00Z" }), o({ created_at: "2026-09-20T10:00:00Z" }),
      o({ customer_whatsapp: "21 98888-2222", customer_name: "Bia", created_at: "2026-06-01T10:00:00Z" }),
    ], now);
    expect(filterBuyers(list, "repeat").map((b) => b.name)).toEqual(["Ana"]);
    expect(filterBuyers(list, "inactive90").map((b) => b.name)).toEqual(["Bia"]);
    expect(filterBuyers(list, "all", "bia")).toHaveLength(1);
  });
  it("ignora pedido sem WhatsApp", () => {
    expect(buildBuyers([o({ customer_whatsapp: "" })], now)).toEqual([]);
  });
});
