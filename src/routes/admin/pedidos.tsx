import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, EmptyState, PageHeader, TableSkeleton } from "@/components/admin/AdminUI";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/products";
import {
  ORDER_STATUSES,
  ordersQueryOptions,
  setOrderStatus,
  type OrderStatus,
} from "@/lib/adminData";

export const Route = createFileRoute("/admin/pedidos")({
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

function OrdersPage() {
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery(ordersQueryOptions);
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [customer, setCustomer] = useState("");
  const [date, setDate] = useState("");

  const change = useMutation({
    mutationFn: ({ id, value }: { id: string; value: OrderStatus }) => setOrderStatus(id, value),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ordersQueryOptions.queryKey });
    },
    onError: () => toast.error("Não foi possível atualizar o status"),
  });

  const rows = useMemo(
    () =>
      orders.filter((o) => {
        if (status !== "all" && o.status !== status) return false;
        if (payment !== "all" && o.payment_method !== payment) return false;
        if (customer && !`${o.customer_name} ${o.customer_whatsapp} ${o.code}`.toLowerCase().includes(customer.toLowerCase())) return false;
        if (date && !o.created_at.startsWith(date)) return false;
        return true;
      }),
    [orders, status, payment, customer, date],
  );

  return (
    <div>
      <PageHeader title="Pedidos" description="Acompanhe e atualize o status de cada pedido." />

      <AdminCard className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input placeholder="Cliente, WhatsApp ou código" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={payment} onValueChange={setPayment}>
          <SelectTrigger><SelectValue placeholder="Pagamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as formas</SelectItem>
            <SelectItem value="pix">Pix</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </AdminCard>

      <AdminCard className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="size-5" />}
            title="Nenhum pedido encontrado"
            description="Pedidos registrados aparecem aqui com filtros por status, cliente, data e pagamento."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <p className="font-bold">{o.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("pt-BR")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{o.customer_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_whatsapp}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{o.payment_method}</td>
                    <td className="px-4 py-3 font-bold tabular-nums">{formatBRL(Number(o.total))}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={o.status}
                        onValueChange={(v) => change.mutate({ id: o.id, value: v as OrderStatus })}
                      >
                        <SelectTrigger className="w-36 capitalize"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
