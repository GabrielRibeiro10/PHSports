import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, MessageCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, EmptyState, PageHeader, TableSkeleton } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildBuyers, filterBuyers, type BuyerFilter } from "@/lib/buyers";
import { datedName, downloadCsv, toCsv } from "@/lib/csv";
import { customerWhatsappHref } from "@/lib/adminOrders";
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
  const [view, setView] = useState<"buyers" | "registered">("buyers");
  const [filter, setFilter] = useState<BuyerFilter>("all");
  const buyers = useMemo(() => filterBuyers(buildBuyers(orders), filter, search), [orders, filter, search]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers
      .filter((c) => !term || `${c.name} ${c.email} ${c.whatsapp}`.toLowerCase().includes(term))
      .map((c) => {
        const own = orders.filter((o) => o.customer_id === c.id && o.payment_status === "confirmado" && o.fulfillment_status !== "cancelado");
        return {
          ...c,
          orders: own.length,
          spent: own.reduce((s, o) => s + Number(o.total), 0),
        };
      });
  }, [customers, orders, search]);

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Quem já comprou (pelos pedidos pagos) e quem está cadastrado. Use para chamar de volta quem sumiu."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              if (view === "buyers") {
                if (!buyers.length) { toast.info("Ninguém para exportar com esse filtro."); return; }
                downloadCsv(datedName("compradores"), toCsv(buyers, [
                  { header: "Nome", value: (b) => b.name }, { header: "WhatsApp", value: (b) => b.whatsapp }, { header: "Cidade", value: (b) => b.city },
                  { header: "Pedidos pagos", value: (b) => b.orders }, { header: "Total gasto (R$)", value: (b) => b.spent },
                  { header: "Última compra", value: (b) => new Date(b.lastAt).toLocaleDateString("pt-BR") }, { header: "Dias sem comprar", value: (b) => b.daysSince },
                ]));
              } else {
                if (!rows.length) { toast.info("Nenhum cliente para exportar."); return; }
                downloadCsv(datedName("clientes"), toCsv(rows, [
                  { header: "Nome", value: (c) => c.name }, { header: "WhatsApp", value: (c) => c.whatsapp }, { header: "E-mail", value: (c) => c.email },
                  { header: "Pedidos pagos", value: (c) => c.orders }, { header: "Total gasto (R$)", value: (c) => c.spent },
                  { header: "Cadastro", value: (c) => new Date(c.created_at).toLocaleDateString("pt-BR") },
                ]));
              }
            }}
          >
            <Download /> Exportar planilha
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Tipo de lista">
        <Button role="tab" aria-selected={view === "buyers"} size="sm" variant={view === "buyers" ? "default" : "outline"} onClick={() => setView("buyers")}>Compradores</Button>
        <Button role="tab" aria-selected={view === "registered"} size="sm" variant={view === "registered" ? "default" : "outline"} onClick={() => setView("registered")}>Cadastrados</Button>
      </div>

      <AdminCard className="mb-4 p-4">
        <Input
          placeholder="Buscar por nome, e-mail ou WhatsApp"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </AdminCard>

      {view === "buyers" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtro de compradores">
            {([["all", "Todos"], ["repeat", "Compraram mais de uma vez"], ["inactive60", "Sem comprar há 60+ dias"], ["inactive90", "Sem comprar há 90+ dias"]] as const).map(([k, l]) => (
              <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</Button>
            ))}
          </div>
          <AdminCard className="overflow-hidden">
            {buyers.length === 0 ? (
              <EmptyState icon={<Users className="size-5" />} title="Nenhum comprador nesse filtro" description="Aparecem aqui os clientes com pelo menos um pedido com pagamento confirmado." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Cidade</th><th className="px-4 py-3">Pedidos</th><th className="px-4 py-3">Total gasto</th><th className="px-4 py-3">Última compra</th><th className="px-4 py-3 text-right">Chamar</th></tr>
                  </thead>
                  <tbody>
                    {buyers.map((b) => (
                      <tr key={b.key} className="border-b border-border last:border-0 hover:bg-secondary/30">
                        <td className="px-4 py-3"><p className="font-bold">{b.name || "—"}</p><p className="text-xs text-muted-foreground">{b.whatsapp}</p></td>
                        <td className="px-4 py-3">{b.city || "—"}</td>
                        <td className="px-4 py-3 tabular-nums">{b.orders}</td>
                        <td className="px-4 py-3 font-bold tabular-nums">{formatBRL(b.spent)}</td>
                        <td className="px-4 py-3"><p>{new Date(b.lastAt).toLocaleDateString("pt-BR")}</p><p className={`text-xs ${b.daysSince >= 60 ? "font-semibold text-amber-700" : "text-muted-foreground"}`}>há {b.daysSince} {b.daysSince === 1 ? "dia" : "dias"}</p></td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild size="sm" variant="outline">
                            <a href={customerWhatsappHref(b.whatsapp, `Olá, ${b.name.split(" ")[0] || ""}! Aqui é da PH Sports. Chegaram novidades que combinam com você. Quer dar uma olhada?`)} target="_blank" rel="noopener noreferrer" aria-label={`Chamar ${b.name} no WhatsApp`}>
                              <MessageCircle /> WhatsApp
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </>
      )}

      {view === "registered" && (
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
      )}
    </div>
  );
}
