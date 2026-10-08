// Cálculos do dashboard (puros, testáveis): série diária completa, variação e produtos mais vendidos.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Uma linha por dia do período (dias sem venda valem zero), para o gráfico não "pular" datas. */
export function fillDays(daily: { day: string; total: number }[], days: number, today = new Date()) {
  const byDay = new Map(daily.map((d) => [d.day.slice(0, 10), Number(d.total)]));
  const out: { day: string; label: string; total: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(d);
    out.push({ day: key, label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), total: byDay.get(key) ?? 0 });
  }
  return out;
}

/** Variação percentual inteira; null quando não há base de comparação. */
export function delta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type SoldLine = { product_name: string; quantity: number; unit_price: number };
export function topProducts(lines: SoldLine[], limit = 5) {
  const map = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const l of lines) {
    const cur = map.get(l.product_name) ?? { name: l.product_name, qty: 0, revenue: 0 };
    cur.qty += l.quantity;
    cur.revenue += l.quantity * Number(l.unit_price);
    map.set(l.product_name, cur);
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, limit);
}

/** Itens de pedidos com pagamento confirmado no período (no máximo 5.000 linhas). */
export const soldLinesQuery = (fromIso: string, toIso: string) =>
  queryOptions({
    queryKey: ["admin-sold-lines", fromIso, toIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("product_name, quantity, unit_price, orders!inner(payment_status, created_at)")
        .eq("orders.payment_status", "confirmado")
        .gte("orders.created_at", fromIso)
        .lt("orders.created_at", toIso)
        .limit(5000);
      if (error) throw new Error("Não foi possível carregar os produtos mais vendidos.");
      return (data ?? []) as unknown as SoldLine[];
    },
  });
