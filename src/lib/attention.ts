// "O que precisa de atenção agora": calculado a partir do resumo do banco (admin_dashboard) e atualizado sozinho.
import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { dashboardQuery, operationSettingsQuery, type Dashboard } from "@/lib/adminOrders";

export type AttentionItem = {
  id: string;
  tone: "warning" | "info" | "danger";
  title: string;
  hint: string;
  to: string;
  search?: Record<string, string>;
  count: number;
};

export function buildAttention(d: Dashboard | undefined, low: number): AttentionItem[] {
  if (!d) return [];
  const out: AttentionItem[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (d.awaiting > 0)
    out.push({ id: "awaiting", tone: "warning", count: d.awaiting, title: plural(d.awaiting, "pedido novo para atender", "pedidos novos para atender"), hint: "Responda o cliente no WhatsApp e combine pagamento e frete.", to: "/admin/pedidos", search: { situacao: "aguardando_atendimento" } });
  if (d.shipping_pending > 0)
    out.push({ id: "shipping", tone: "warning", count: d.shipping_pending, title: plural(d.shipping_pending, "pedido com frete a definir", "pedidos com frete a definir"), hint: "Sem frete definido não dá para confirmar o pagamento.", to: "/admin/pedidos", search: { situacao: "aguardando_atendimento" } });
  if (d.payment_pending > 0)
    out.push({ id: "payment", tone: "info", count: d.payment_pending, title: plural(d.payment_pending, "pagamento pendente", "pagamentos pendentes"), hint: "Confirme quando o Pix cair na conta.", to: "/admin/pedidos", search: { pagamento: "pendente" } });
  if (d.paid_to_ship > 0)
    out.push({ id: "ship", tone: "danger", count: d.paid_to_ship, title: plural(d.paid_to_ship, "pedido pago esperando envio", "pedidos pagos esperando envio"), hint: "Separe, embale e poste (ou combine a entrega).", to: "/admin/pedidos", search: { situacao: "em_preparacao" } });
  const out0 = d.low_stock.filter((l) => l.quantity === 0).length;
  const lowOnly = d.low_stock.length - out0;
  if (out0 > 0)
    out.push({ id: "soldout", tone: "danger", count: out0, title: plural(out0, "tamanho esgotado", "tamanhos esgotados"), hint: "Reponha ou oculte o produto da loja.", to: "/admin/estoque" });
  if (lowOnly > 0)
    out.push({ id: "low", tone: "info", count: lowOnly, title: plural(lowOnly, `tamanho com estoque baixo (até ${low} un.)`, `tamanhos com estoque baixo (até ${low} un.)`), hint: "Hora de repor antes de acabar.", to: "/admin/estoque" });
  if (d.untracked_products > 0)
    out.push({ id: "untracked", tone: "info", count: d.untracked_products, title: plural(d.untracked_products, "produto sem estoque cadastrado", "produtos sem estoque cadastrado"), hint: "Sem estoque cadastrado não dá para confirmar pagamento.", to: "/admin/estoque" });
  return out;
}

export function useAttention() {
  const settings = useQuery(operationSettingsQuery);
  const low = Math.max(0, Number(settings.data?.low_stock ?? 3) || 3);
  // Janela fixa do dia: só os contadores do resumo importam aqui.
  const { from, to } = useMemo(() => {
    const end = new Date();
    end.setHours(24, 0, 0, 0);
    return { from: new Date(end.getTime() - 86_400_000).toISOString(), to: end.toISOString() };
  }, []);
  const q = useQuery({ ...dashboardQuery(from, to, low), queryKey: ["admin-attention", low], refetchInterval: 60_000, refetchOnWindowFocus: true });
  const items = useMemo(() => buildAttention(q.data, low), [q.data, low]);
  const urgent = items.reduce((n, i) => n + (i.id === "awaiting" || i.id === "ship" || i.id === "soldout" ? i.count : 0), 0);

  // Avisa quando chegar pedido novo com o painel aberto.
  const lastAwaiting = useRef<number | null>(null);
  const awaiting = q.data?.awaiting;
  useEffect(() => {
    if (awaiting === undefined) return;
    if (lastAwaiting.current !== null && awaiting > lastAwaiting.current) {
      const n = awaiting - lastAwaiting.current;
      const msg = n === 1 ? "Chegou um pedido novo!" : `Chegaram ${n} pedidos novos!`;
      toast.success(msg);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try { new Notification("PH Sports", { body: msg }); } catch { /* alguns navegadores móveis não permitem */ }
      }
    }
    lastAwaiting.current = awaiting;
  }, [awaiting]);

  // Número no título da aba: "(3) Painel PH Sports".
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = urgent > 0 ? `(${urgent}) ${base}` : base;
    return () => { document.title = base; };
  }, [urgent, items.length]);

  return { items, urgent, loading: q.isLoading, error: q.error as Error | null, refetch: q.refetch };
}
