// Compradores agrupados pelo WhatsApp (o pedido não depende de cadastro): base para recompra e exportação.
import type { OrderRow } from "@/lib/adminOrders";

export type Buyer = {
  key: string;
  name: string;
  whatsapp: string;
  orders: number;
  spent: number;
  lastAt: string; // ISO do último pedido pago
  daysSince: number;
  city: string;
};

const digits = (s: string) => s.replace(/\D/g, "");
/** 11 99999-9999, +55 11 99999-9999 e 5511999999999 viram a mesma chave. */
export const phoneKey = (s: string) => {
  const d = digits(s);
  return d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
};

/** Só pedidos com pagamento confirmado e não cancelados contam como compra. */
export function buildBuyers(orders: OrderRow[], now = new Date()): Buyer[] {
  const map = new Map<string, Buyer>();
  for (const o of orders) {
    if (o.payment_status !== "confirmado" || o.fulfillment_status === "cancelado") continue;
    const key = phoneKey(o.customer_whatsapp);
    if (!key) continue;
    const at = o.payment_confirmed_at ?? o.created_at;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { key, name: o.customer_name, whatsapp: o.customer_whatsapp, orders: 1, spent: Number(o.total), lastAt: at, daysSince: 0, city: o.ship_city });
    } else {
      cur.orders += 1;
      cur.spent += Number(o.total);
      if (at > cur.lastAt) { cur.lastAt = at; cur.name = o.customer_name || cur.name; cur.city = o.ship_city || cur.city; }
    }
  }
  for (const b of map.values()) b.daysSince = Math.max(0, Math.floor((now.getTime() - new Date(b.lastAt).getTime()) / 86_400_000));
  return [...map.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export type BuyerFilter = "all" | "repeat" | "inactive60" | "inactive90";
export function filterBuyers(list: Buyer[], f: BuyerFilter, term = "") {
  const t = term.trim().toLowerCase();
  return list.filter((b) => {
    if (f === "repeat" && b.orders < 2) return false;
    if (f === "inactive60" && b.daysSince < 60) return false;
    if (f === "inactive90" && b.daysSince < 90) return false;
    return !t || `${b.name} ${b.whatsapp} ${b.city}`.toLowerCase().includes(t);
  });
}
