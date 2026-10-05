import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Clock, DollarSign, PackageCheck, ShoppingCart, Wallet } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, CardsSkeleton, EmptyState, PageHeader, StatCard } from "@/components/admin/AdminUI";
import { Badge } from "@/components/admin/OrderBadges";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/products";
import { dashboardQuery, FULFILLMENT_LABEL, listOrders, operationSettingsQuery, PAYMENT_LABEL, type Fulfillment, type Payment } from "@/lib/adminOrders";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Dashboard — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <DashboardPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

function DashboardPage() {
  const [days, setDays] = useState(30);
  const settings = useQuery(operationSettingsQuery);
  const low = Math.max(0, Number(settings.data?.low_stock ?? 3) || 3);
  // Período fechado no dia de hoje (até o fim do dia).
  const { from, to } = useMemo(() => {
    const end = new Date();
    end.setHours(24, 0, 0, 0);
    const start = new Date(end.getTime() - days * 86_400_000);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [days]);
  const dash = useQuery(dashboardQuery(from, to, low));
  const recent = useQuery({
    queryKey: ["admin-orders-page", "recent"],
    queryFn: () => listOrders({ page: 1, pageSize: 6, q: "", from: "", to: "", payment: "", fulfillment: "" }),
  });
  const d = dash.data;
  const max = Math.max(1, ...(d?.daily ?? []).map((x) => Number(x.total)));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Números reais dos pedidos. Vendas contam só pagamentos confirmados (sem pendentes, cancelados ou reembolsados)."
        actions={
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <Button key={p.days} size="sm" variant={days === p.days ? "default" : "outline"} onClick={() => setDays(p.days)}>
                {p.label}
              </Button>
            ))}
          </div>
        }
      />

      {dash.isLoading ? (
        <CardsSkeleton count={4} />
      ) : dash.error ? (
        <AdminCard>
          <EmptyState
            icon={<AlertTriangle className="size-5" />}
            title="Não foi possível carregar o resumo"
            description={(dash.error as Error).message}
            action={<Button onClick={() => dash.refetch()}>Tentar de novo</Button>}
          />
        </AdminCard>
      ) : d ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Aguardando atendimento" value={String(d.awaiting)} icon={<Clock className="size-5" />} tone={d.awaiting ? "warning" : "default"} hint="Pedidos novos do WhatsApp" />
            <StatCard
              label="Pagamento pendente"
              value={String(d.payment_pending)}
              icon={<Wallet className="size-5" />}
              tone={d.payment_pending ? "warning" : "default"}
              hint={d.shipping_pending ? `${d.shipping_pending} com frete a definir` : "Não contam como venda"}
            />
            <StatCard label="Pagos aguardando envio" value={String(d.paid_to_ship)} icon={<PackageCheck className="size-5" />} tone={d.paid_to_ship ? "brand" : "default"} hint="Separar e postar" />
            <StatCard
              label={`Vendas confirmadas · ${days} dias`}
              value={formatBRL(Number(d.revenue))}
              icon={<DollarSign className="size-5" />}
              tone="brand"
              hint={`${d.paid_orders} ${d.paid_orders === 1 ? "pedido pago" : "pedidos pagos"}`}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <AdminCard className="p-5">
              <h2 className="mb-4 text-sm font-bold">Vendas confirmadas por dia</h2>
              {d.daily.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Nenhum pagamento confirmado neste período.</p>
              ) : (
                <ul className="grid gap-1.5">
                  {d.daily
                    .slice()
                    .reverse()
                    .map((x) => (
                      <li key={x.day} className="grid grid-cols-[72px_1fr_96px] items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{new Date(`${x.day}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                        <span className="h-2.5 rounded-full bg-primary" style={{ width: `${Math.max(3, (Number(x.total) / max) * 100)}%` }} />
                        <span className="text-right font-semibold tabular-nums">{formatBRL(Number(x.total))}</span>
                      </li>
                    ))}
                </ul>
              )}
            </AdminCard>

            <AdminCard className="p-5">
              <h2 className="mb-1 text-sm font-bold">Estoque baixo (até {low} un.)</h2>
              {d.untracked_products > 0 && (
                <p className="mb-3 text-xs text-amber-700">
                  {d.untracked_products} {d.untracked_products === 1 ? "produto ativo sem" : "produtos ativos sem"} estoque cadastrado.{" "}
                  <Link to="/admin/estoque" className="underline">Cadastrar</Link>
                </p>
              )}
              {d.low_stock.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum tamanho com estoque baixo.</p>
              ) : (
                <ul className="grid max-h-72 gap-1.5 overflow-y-auto text-sm">
                  {d.low_stock.map((l) => (
                    <li key={`${l.product_id}-${l.size}`} className="flex justify-between gap-3">
                      <span className="truncate">
                        {l.name} · <strong>{l.size}</strong>
                      </span>
                      <span className={`shrink-0 font-bold tabular-nums ${l.quantity === 0 ? "text-destructive" : "text-amber-700"}`}>
                        {l.quantity === 0 ? "esgotado" : `${l.quantity} un.`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>
          </div>
        </>
      ) : null}

      <AdminCard className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-sm font-bold">Últimos pedidos</h2>
          <Link to="/admin/pedidos" className="text-sm underline">Ver todos</Link>
        </div>
        {recent.data && recent.data.rows.length === 0 ? (
          <EmptyState icon={<ShoppingCart className="size-5" />} title="Nenhum pedido ainda" description="Os pedidos finalizados pelo WhatsApp aparecem aqui." />
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {(recent.data?.rows ?? []).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <Link to="/admin/pedido/$id" params={{ id: o.id }} className="font-bold hover:underline">
                  {o.code}
                </Link>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{o.customer_name}</span>
                <span className="font-semibold tabular-nums">{formatBRL(Number(o.total))}</span>
                <Badge status={o.payment_status} label={PAYMENT_LABEL[o.payment_status as Payment]} />
                <Badge status={o.fulfillment_status} label={FULFILLMENT_LABEL[o.fulfillment_status as Fulfillment]} />
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
