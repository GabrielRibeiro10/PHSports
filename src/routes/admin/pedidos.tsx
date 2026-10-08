import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, PackageCheck, Printer, RefreshCw, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, EmptyState, PageHeader, TableSkeleton } from "@/components/admin/AdminUI";
import { Badge } from "@/components/admin/OrderBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/products";
import { datedName, downloadCsv } from "@/lib/csv";
import { ordersToCsv } from "@/lib/orderExport";
import { fetchOrdersByIds, itemsOfOrders, listAllOrders, runBatch, setFulfillment } from "@/lib/adminOrders";
import { pickingPage, printDocument, receiptPage } from "@/lib/print";
import {
  FULFILLMENT_LABEL,
  listOrders,
  PAYMENT_LABEL,
  SHIPPING_LABEL,
  type Fulfillment,
  type OrderFilters,
  type Payment,
} from "@/lib/adminOrders";

const SITUACOES = Object.keys(FULFILLMENT_LABEL);
const PAGAMENTOS = Object.keys(PAYMENT_LABEL);

export const Route = createFileRoute("/admin/pedidos")({
  // Links do sino de avisos e do dashboard abrem a lista já filtrada.
  validateSearch: (s: Record<string, unknown>): { situacao?: Fulfillment; pagamento?: Payment } => {
    const out: { situacao?: Fulfillment; pagamento?: Payment } = {};
    if (typeof s.situacao === "string" && SITUACOES.includes(s.situacao)) out.situacao = s.situacao as Fulfillment;
    if (typeof s.pagamento === "string" && PAGAMENTOS.includes(s.pagamento)) out.pagamento = s.pagamento as Payment;
    return out;
  },
  head: () => ({
    meta: [{ title: "Pedidos — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <OrdersPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

const PAGE_SIZE = 20;
const select = "h-9 rounded-md border border-input bg-background px-3 text-sm";

function OrdersPage() {
  const search = Route.useSearch();
  const [filters, setFilters] = useState<OrderFilters>({ page: 1, pageSize: PAGE_SIZE, q: "", from: "", to: "", payment: search.pagamento ?? "", fulfillment: search.situacao ?? "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"" | "export" | "print" | "prepare">("");
  useEffect(() => { setFilters((f) => ({ ...f, payment: search.pagamento ?? "", fulfillment: search.situacao ?? "", page: 1 })); }, [search.pagamento, search.situacao]);
  const [q, setQ] = useState("");

  // Busca com pequena espera para não consultar a cada letra.
  useEffect(() => {
    const t = window.setTimeout(() => setFilters((f) => (f.q === q ? f : { ...f, q, page: 1 })), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  const set = (patch: Partial<OrderFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["admin-orders-page", filters],
    queryFn: () => listOrders(filters),
    placeholderData: keepPreviousData,
  });
  const pages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const rows = data?.rows ?? [];
  const allOnPage = rows.length > 0 && rows.every((o) => selected.has(o.id));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () => setSelected((s) => { const n = new Set(s); for (const o of rows) { if (allOnPage) n.delete(o.id); else n.add(o.id); } return n; });

  const exportCsv = async () => {
    setBusy("export");
    try {
      const list = await listAllOrders({ q: filters.q, from: filters.from, to: filters.to, payment: filters.payment, fulfillment: filters.fulfillment });
      if (!list.length) { toast.info("Nenhum pedido para exportar com esses filtros."); return; }
      downloadCsv(datedName("pedidos"), ordersToCsv(list));
      toast.success(`${list.length} ${list.length === 1 ? "pedido exportado" : "pedidos exportados"}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível exportar."); } finally { setBusy(""); }
  };
  const printSelected = async (kind: "picking" | "receipt") => {
    setBusy("print");
    try {
      const ids = [...selected];
      const [orders, items] = await Promise.all([fetchOrdersByIds(ids), itemsOfOrders(ids)]);
      const page = kind === "picking" ? pickingPage : receiptPage;
      printDocument(kind === "picking" ? "Listas de separação" : "Recibos", orders.map((o) => page(o, items.filter((i) => i.order_id === o.id))).join(""));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível imprimir."); } finally { setBusy(""); }
  };
  const prepareSelected = async () => {
    setBusy("prepare");
    try {
      const { ok, failures } = await runBatch([...selected], (id) => setFulfillment(id, "em_preparacao"));
      if (ok) toast.success(`${ok} ${ok === 1 ? "pedido passou" : "pedidos passaram"} para “Em preparação”`);
      if (failures.length) toast.error(`${failures.length} não puderam mudar: ${failures[0].message}`);
      setSelected(new Set());
      await refetch();
    } finally { setBusy(""); }
  };
  const filtered = Boolean(filters.q || filters.from || filters.to || filters.payment || filters.fulfillment);

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description="Pedidos reais criados pelo site. Pagamento e atendimento são acompanhados separadamente."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={busy === "export"}>
              <Download /> {busy === "export" ? "Exportando…" : "Exportar planilha"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "animate-spin" : ""} /> Atualizar
            </Button>
          </div>
        }
      />

      <AdminCard className="mb-4 grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <Input placeholder="Número do pedido, nome ou WhatsApp" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar pedidos" />
        <select className={select} value={filters.fulfillment} onChange={(e) => set({ fulfillment: e.target.value as Fulfillment | "" })} aria-label="Situação">
          <option value="">Todas as situações</option>
          {Object.entries(FULFILLMENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className={select} value={filters.payment} onChange={(e) => set({ payment: e.target.value as Payment | "" })} aria-label="Pagamento">
          <option value="">Todos os pagamentos</option>
          {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>Pagamento {v.toLowerCase()}</option>
          ))}
        </select>
        <Input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} aria-label="De" />
        <Input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} aria-label="Até" />
      </AdminCard>

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-background p-3 shadow-md" role="region" aria-label="Ações em lote">
          <span className="mr-auto text-sm font-bold">{selected.size} {selected.size === 1 ? "selecionado" : "selecionados"}</span>
          <Button size="sm" variant="outline" disabled={busy !== ""} onClick={() => void printSelected("picking")}><Printer /> Lista de separação</Button>
          <Button size="sm" variant="outline" disabled={busy !== ""} onClick={() => void printSelected("receipt")}><Printer /> Recibos</Button>
          <Button size="sm" disabled={busy !== ""} onClick={() => void prepareSelected()}><PackageCheck /> Passar para “Em preparação”</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar</Button>
        </div>
      )}

      <AdminCard className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <EmptyState
            icon={<ShoppingCart className="size-5" />}
            title="Não foi possível carregar os pedidos"
            description={(error as Error).message}
            action={<Button onClick={() => refetch()}>Tentar de novo</Button>}
          />
        ) : !data?.rows.length ? (
          <EmptyState
            icon={<ShoppingCart className="size-5" />}
            title={filtered ? "Nenhum pedido com esses filtros" : "Nenhum pedido ainda"}
            description={filtered ? "Mude a busca ou os filtros." : "Quando alguém finalizar pelo WhatsApp, o pedido aparece aqui como “Aguardando atendimento”."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Selecionar todos desta página" checked={allOnPage} onChange={togglePage} /></th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Situação</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((o) => (
                  <tr key={o.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 ${selected.has(o.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3"><input type="checkbox" aria-label={`Selecionar pedido ${o.code}`} checked={selected.has(o.id)} onChange={() => toggle(o.id)} /></td>
                    <td className="px-4 py-3">
                      <Link to="/admin/pedido/$id" params={{ id: o.id }} className="font-bold hover:underline">
                        {o.code}
                      </Link>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{o.customer_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_whatsapp}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold tabular-nums">{formatBRL(Number(o.total))}</p>
                      <p className={`text-xs ${o.shipping_status === "pendente" ? "font-semibold text-amber-700" : "text-muted-foreground"}`}>
                        {o.shipping_status === "pendente" ? "+ frete pendente" : `${SHIPPING_LABEL[o.shipping_status] ?? ""}: ${formatBRL(Number(o.shipping))}`}
                      </p>
                    </td>
                    <td className="px-4 py-3"><Badge status={o.payment_status} label={PAYMENT_LABEL[o.payment_status as Payment]} /></td>
                    <td className="px-4 py-3"><Badge status={o.fulfillment_status} label={FULFILLMENT_LABEL[o.fulfillment_status as Fulfillment]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.count > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {data.count} {data.count === 1 ? "pedido" : "pedidos"} · página {filters.page} de {pages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={filters.page <= 1 || isFetching} onClick={() => set({ page: filters.page - 1 })}>
                <ChevronLeft /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={filters.page >= pages || isFetching} onClick={() => set({ page: filters.page + 1 })}>
                Próxima <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
