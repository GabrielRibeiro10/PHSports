import { describe, expect, it } from "vitest";
import { buildAttention } from "./attention";
import type { Dashboard } from "@/lib/adminOrders";

const base: Dashboard = { awaiting: 0, payment_pending: 0, shipping_pending: 0, paid_to_ship: 0, revenue: 0, paid_orders: 0, daily: [], low_stock: [], untracked_products: 0 };

describe("buildAttention", () => {
  it("sem pendências não mostra nada", () => {
    expect(buildAttention(base, 3)).toEqual([]);
    expect(buildAttention(undefined, 3)).toEqual([]);
  });
  it("usa singular e plural corretos", () => {
    expect(buildAttention({ ...base, awaiting: 1 }, 3)[0].title).toBe("1 pedido novo para atender");
    expect(buildAttention({ ...base, awaiting: 4 }, 3)[0].title).toBe("4 pedidos novos para atender");
  });
  it("separa esgotado de estoque baixo", () => {
    const items = buildAttention({ ...base, low_stock: [{ product_id: "a", name: "A", size: "P", quantity: 0 }, { product_id: "b", name: "B", size: "M", quantity: 2 }] }, 3);
    expect(items.map((i) => i.id)).toEqual(["soldout", "low"]);
    expect(items[1].title).toContain("até 3 un.");
  });
  it("pedido pago esperando envio é urgente", () => {
    expect(buildAttention({ ...base, paid_to_ship: 2 }, 3)[0].tone).toBe("danger");
  });
});
