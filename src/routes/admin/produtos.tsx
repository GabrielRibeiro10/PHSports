import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProductFormDialog } from "@/components/admin/ProductFormDialog";
import { AdminCard, EmptyState, PageHeader, TableSkeleton } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL } from "@/lib/products";
import {
  adminProductsQueryOptions,
  deleteProduct,
  setProductActive,
  type AdminProductRow,
} from "@/lib/adminCatalog";

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({
    meta: [{ title: "Produtos — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <AdminProductsPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

const PER_PAGE = 10;

function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery(adminProductsQueryOptions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProductRow | null>(null);
  const [toDelete, setToDelete] = useState<AdminProductRow | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: adminProductsQueryOptions.queryKey });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setProductActive(id, active),
    onSuccess: invalidate,
    onError: () => toast.error("Não foi possível atualizar a visibilidade"),
  });

  const removeProduct = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Produto removido");
      invalidate();
    },
    onError: () => toast.error("Não foi possível remover o produto"),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (status === "active" && !p.active) return false;
      if (status === "inactive" && p.active) return false;
      if (!term) return true;
      return `${p.name} ${p.club} ${p.slug}`.toLowerCase().includes(term);
    });
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-desc") sorted.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "stock") sorted.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
    return sorted;
  }, [products, search, category, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Altere preços, estoque, imagens e disponibilidade. Tudo reflete na loja na hora."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus /> Novo produto
          </Button>
        }
      />

      <AdminCard className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome, clube ou slug"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="masculino">Masculino</SelectItem>
            <SelectItem value="feminino">Feminino</SelectItem>
            <SelectItem value="retro">Retrô</SelectItem>
            <SelectItem value="caneleiras">Caneleiras</SelectItem>
            <SelectItem value="jogador">Versão jogador</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Visíveis</SelectItem>
            <SelectItem value="inactive">Ocultos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Ordem padrão</SelectItem>
            <SelectItem value="name">Nome (A-Z)</SelectItem>
            <SelectItem value="price-asc">Menor preço</SelectItem>
            <SelectItem value="price-desc">Maior preço</SelectItem>
            <SelectItem value="stock">Menor estoque</SelectItem>
          </SelectContent>
        </Select>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Package className="size-5" />}
            title="Nenhum produto encontrado"
            description="Ajuste os filtros ou cadastre um novo produto."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Estoque</th>
                  <th className="px-4 py-3">Visível</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border transition-colors last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.image_url} alt="" className="size-12 rounded-lg border border-border object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-bold">
                            {p.name} {p.featured && <span className="text-primary">★</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{p.club} • /{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{p.category}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold">{formatBRL(Number(p.price))}</div>
                      {Number(p.old_price) > Number(p.price) && (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatBRL(Number(p.old_price))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={(p.stock ?? 0) <= 3 ? "font-bold text-amber-600" : ""}>
                        {p.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={p.active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: p.id, active: v })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="outline" aria-label="Editar" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                          <Pencil />
                        </Button>
                        <Button size="icon" variant="outline" aria-label="Remover" onClick={() => setToDelete(p)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {filtered.length} produtos • página {current} de {pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      <ProductFormDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita e o produto sai imediatamente da loja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) removeProduct.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
