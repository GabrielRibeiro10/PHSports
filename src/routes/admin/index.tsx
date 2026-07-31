import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Activity,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  AdminCard,
  CardsSkeleton,
  EmptyState,
  PageHeader,
  StatCard,
  StatusPill,
} from "@/components/admin/AdminUI";
import { formatBRL } from "@/lib/products";
import { adminProductsQueryOptions } from "@/lib/adminCatalog";
import {
  auditQueryOptions,
  customersQueryOptions,
  orderItemsQueryOptions,
  ordersQueryOptions,
} from "@/lib/adminData";

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

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function DashboardPage() {
  const products = useQuery(adminProductsQueryOptions);
  const orders = useQuery(ordersQueryOptions);
  const customers = useQuery(customersQueryOptions);
  const items = useQuery(orderItemsQueryOptions);
  const audit = useQuery(auditQueryOptions);

  const loading = products.isLoading || orders.isLoading || customers.isLoading;
  const orderRows = orders.data ?? [];
  const paidOrders = orderRows.filter((o) => o.status !== "cancelado");
  const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const lowStock = (products.data ?? []).filter((p) => (p.stock ?? 0) <= 3);

  // last 6 months revenue
  const now = new Date();
  const chart = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const total = paidOrders
      .filter((o) => {
        const od = new Date(o.created_at);
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      })
      .reduce((s, o) => s + Number(o.total), 0);
    return { label: MONTHS[d.getMonth()], total };
  });
  const chartMax = Math.max(1, ...chart.map((c) => c.total));

  const topProducts = Object.values(
    (items.data ?? []).reduce<Record<string, { name: string; qty: number; total: number }>>(
      (acc, it) => {
        const key = it.product_name;
        acc[key] = acc[key] ?? { name: key, qty: 0, total: 0 };
        acc[key].qty += it.quantity;
        acc[key].total += it.quantity * Number(it.unit_price);
        return acc;
      },
      {},
    ),
  )
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação da loja em tempo real."
      />

      {loading ? (
        <CardsSkeleton count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Faturamento"
            value={formatBRL(revenue)}
            hint={`${paidOrders.length} pedidos válidos`}
            tone="brand"
            icon={<DollarSign className="size-5" />}
          />
          <StatCard
            label="Total de vendas"
            value={String(paidOrders.length)}
            hint="Pedidos não cancelados"
            icon={<TrendingUp className="size-5" />}
          />
          <StatCard
            label="Pedidos"
            value={String(orderRows.length)}
            hint={`${orderRows.filter((o) => o.status === "pendente").length} pendentes`}
            icon={<ShoppingCart className="size-5" />}
          />
          <StatCard
            label="Clientes"
            value={String((customers.data ?? []).length)}
            icon={<Users className="size-5" />}
          />
          <StatCard
            label="Produtos"
            value={String((products.data ?? []).length)}
            hint={`${(products.data ?? []).filter((p) => p.active).length} visíveis na loja`}
            icon={<Package className="size-5" />}
          />
          <StatCard
            label="Estoque baixo"
            value={String(lowStock.length)}
            hint="3 unidades ou menos"
            tone="warning"
            icon={<AlertTriangle className="size-5" />}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <AdminCard className="p-5 lg:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
            Gráfico de vendas (6 meses)
          </h2>
          <div className="mt-6 flex h-48 items-end gap-3">
            {chart.map((c) => (
              <div key={c.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                  {c.total > 0 ? formatBRL(c.total) : ""}
                </span>
                <div
                  className="w-full rounded-t-lg bg-primary/85 transition-all duration-500 hover:bg-primary"
                  style={{ height: `${Math.max(4, (c.total / chartMax) * 100)}%` }}
                />
                <span className="text-xs font-semibold text-muted-foreground">{c.label}</span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
            Produtos mais vendidos
          </h2>
          {topProducts.length === 0 ? (
            <EmptyState title="Sem vendas registradas" description="Os campeões aparecem aqui." />
          ) : (
            <ul className="mt-4 grid gap-3">
              {topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-black">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                  <span className="shrink-0 text-xs font-bold text-muted-foreground">
                    {p.qty}x
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
              Últimos pedidos
            </h2>
            <Link to="/admin/pedidos" className="text-xs font-bold text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          {orderRows.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="size-5" />}
              title="Nenhum pedido ainda"
              description="Os pedidos registrados no painel aparecem aqui."
            />
          ) : (
            <ul className="divide-y divide-border">
              {orderRows.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{o.customer_name || o.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.code} • {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <StatusPill status={o.status} />
                  <span className="shrink-0 text-sm font-black tabular-nums">
                    {formatBRL(Number(o.total))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
              Atividades recentes
            </h2>
          </div>
          {(audit.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Activity className="size-5" />}
              title="Sem atividades"
              description="Ações administrativas ficam registradas aqui."
            />
          ) : (
            <ul className="divide-y divide-border">
              {(audit.data ?? []).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <Activity className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{a.action}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
