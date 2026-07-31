import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, EmptyState, PageHeader, TableSkeleton } from "@/components/admin/AdminUI";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/products";
import { customersQueryOptions, ordersQueryOptions } from "@/lib/adminData";

export const Route = createFileRoute("/admin/clientes")({
  head: () => ({
    meta: [{ title: "Clientes — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <CustomersPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

function CustomersPage() {
  const { data: customers = [], isLoading } = useQuery(customersQueryOptions);
  const { data: orders = [] } = useQuery(ordersQueryOptions);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers
      .filter((c) => !term || `${c.name} ${c.email} ${c.whatsapp}`.toLowerCase().includes(term))
      .map((c) => {
        const own = orders.filter((o) => o.customer_id === c.id && o.status !== "cancelado");
        return {
          ...c,
          orders: own.length,
          spent: own.reduce((s, o) => s + Number(o.total), 0),
        };
      });
  }, [customers, orders, search]);

  return (
    <div>
      <PageHeader title="Clientes" description="Base de clientes com histórico de compras." />

      <AdminCard className="mb-4 p-4">
        <Input
          placeholder="Buscar por nome, e-mail ou WhatsApp"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </AdminCard>

      <AdminCard className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="Nenhum cliente cadastrado"
            description="Clientes registrados no painel aparecem aqui com pedidos e total gasto."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Pedidos</th>
                  <th className="px-4 py-3">Total gasto</th>
                  <th className="px-4 py-3">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3 font-bold">{c.name}</td>
                    <td className="px-4 py-3">{c.whatsapp || "—"}</td>
                    <td className="px-4 py-3">{c.email || "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{c.orders}</td>
                    <td className="px-4 py-3 font-bold tabular-nums">{formatBRL(c.spent)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
