import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes, History, Loader2, Minus, Plus } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, EmptyState, PageHeader, TableSkeleton } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminProductsQueryOptions } from "@/lib/adminCatalog";
import { adjustStock, movementsQuery, stockQuery } from "@/lib/adminOrders";
import { SIZES } from "@/lib/products";

export const Route = createFileRoute("/admin/estoque")({
  head: () => ({ meta: [{ title: "Estoque — Painel PH Sports" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <StockPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

type Target = { productId: string; name: string; size: string; current: number };
const REASON_LABEL: Record<string, string> = { reposicao: "Reposição", ajuste: "Ajuste", venda: "Venda (pagamento confirmado)", cancelamento: "Devolução por cancelamento" };

function StockPage() {
  const products = useQuery(adminProductsQueryOptions);
  const stock = useQuery(stockQuery);
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [historyOf, setHistoryOf] = useState<{ id: string; name: string } | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (products.data ?? [])
      .filter((p) => !term || `${p.name} ${p.club}`.toLowerCase().includes(term))
      .map((p) => {
        const own = (stock.data ?? []).filter((s) => s.product_id === p.id);
        const sizes = [...new Set([...(p.sizes?.length ? p.sizes : [...SIZES]), ...own.map((s) => s.size)])];
        return { p, own, sizes, tracked: own.length > 0 };
      });
  }, [products.data, stock.data, q]);

  const loading = products.isLoading || stock.isLoading;
  const err = products.error || stock.error;

  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Quantidade por produto e tamanho. A baixa acontece só quando o pagamento é confirmado."
      />
      <AdminCard className="mb-4 p-4">
        <Input placeholder="Buscar produto ou clube" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar produto" />
      </AdminCard>

      <AdminCard className="overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : err ? (
          <EmptyState icon={<Boxes className="size-5" />} title="Não foi possível carregar o estoque" description={(err as Error).message} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Boxes className="size-5" />} title="Nenhum produto encontrado" />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ p, own, sizes, tracked }) => (
              <li key={p.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {p.name} {!p.active && <span className="text-xs font-normal text-muted-foreground">(inativo)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tracked ? `Total: ${own.reduce((s, x) => s + x.quantity, 0)} un.` : "Estoque ainda não cadastrado — o pagamento não pode ser confirmado sem ele."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {sizes.map((size) => {
                    const qty = own.find((s) => s.size === size)?.quantity;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setTarget({ productId: p.id, name: p.name, size, current: qty ?? 0 })}
                        className={`min-w-[58px] rounded-lg border px-2 py-1.5 text-center text-xs transition-colors hover:border-foreground/40 ${
                          qty === undefined ? "border-dashed text-muted-foreground" : qty <= 3 ? "border-amber-500/40 bg-amber-500/5" : "border-border"
                        }`}
                        aria-label={`Ajustar ${p.name} tamanho ${size}`}
                      >
                        <span className="block font-bold">{size}</span>
                        <span className="tabular-nums">{qty ?? "—"}</span>
                      </button>
                    );
                  })}
                  <Button variant="ghost" size="sm" onClick={() => setHistoryOf({ id: p.id, name: p.name })}>
                    <History /> Histórico
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {target && <AdjustDialog target={target} onClose={() => setTarget(null)} />}
      {historyOf && <HistoryDialog product={historyOf} onClose={() => setHistoryOf(null)} />}
    </div>
  );
}

function AdjustDialog({ target, onClose }: { target: Target; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"reposicao" | "ajuste">("reposicao");
  const [amount, setAmount] = useState("");
  const [sign, setSign] = useState<1 | -1>(-1);
  const [note, setNote] = useState("");
  const n = Math.floor(Number(amount) || 0);
  const delta = mode === "reposicao" ? n : n * sign;
  const after = target.current + delta;

  const save = useMutation({
    mutationFn: () => adjustStock(target.productId, target.size, delta, mode, note),
    onSuccess: (r) => {
      toast.success(`${target.name} ${target.size}: agora ${r.quantity} un.`);
      qc.invalidateQueries({ queryKey: ["admin-stock"] });
      qc.invalidateQueries({ queryKey: ["admin-movements", target.productId] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target.name} · {target.size}
          </DialogTitle>
          <DialogDescription>Estoque atual: {target.current} un.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex gap-2">
            <Button type="button" variant={mode === "reposicao" ? "default" : "outline"} onClick={() => setMode("reposicao")}>
              Reposição
            </Button>
            <Button type="button" variant={mode === "ajuste" ? "default" : "outline"} onClick={() => setMode("ajuste")}>
              Ajuste / correção
            </Button>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-end gap-2">
            {mode === "ajuste" && (
              <Button type="button" variant="outline" size="icon" onClick={() => setSign(sign === 1 ? -1 : 1)} aria-label={sign === 1 ? "Somar" : "Retirar"}>
                {sign === 1 ? <Plus /> : <Minus />}
              </Button>
            )}
            <div className={`grid gap-1.5 ${mode === "reposicao" ? "col-span-2" : ""}`}>
              <Label htmlFor="adj-qty">{mode === "reposicao" ? "Unidades que chegaram" : sign === 1 ? "Unidades a somar" : "Unidades a retirar"}</Label>
              <Input id="adj-qty" inputMode="numeric" required value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="adj-note">{mode === "ajuste" ? "Motivo (obrigatório)" : "Observação (opcional)"}</Label>
            <Input id="adj-note" required={mode === "ajuste"} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={mode === "ajuste" ? "ex.: contagem, avaria, troca" : "ex.: lote do fornecedor"} />
          </div>
          <p className={`text-sm ${after < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            Depois: <strong>{after}</strong> un. {after < 0 && "— o estoque não pode ficar negativo."}
          </p>
          <Button type="submit" disabled={save.isPending || n <= 0 || after < 0 || (mode === "ajuste" && !note.trim())}>
            {save.isPending ? <Loader2 className="animate-spin" /> : null} Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ product, onClose }: { product: { id: string; name: string }; onClose: () => void }) {
  const { data = [], isLoading, error } = useQuery(movementsQuery(product.id));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico de estoque</DialogTitle>
          <DialogDescription>{product.name} · últimas 50 movimentações</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto text-sm">
            {data.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <p className="font-semibold">
                    {REASON_LABEL[m.reason] ?? m.reason} · tam. {m.size}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                    {m.actor_email ? ` · ${m.actor_email}` : ""}
                    {m.note ? ` · ${m.note}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-right tabular-nums">
                  <span className={m.delta > 0 ? "font-bold text-emerald-700" : "font-bold text-destructive"}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                  <span className="block text-xs text-muted-foreground">fica {m.quantity_after}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
