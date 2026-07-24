import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProductFormDialog } from "@/components/admin/ProductFormDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatBRL } from "@/lib/products";
import {
  adminProductsQueryOptions,
  deleteProduct,
  setProductActive,
  type AdminProductRow,
} from "@/lib/adminCatalog";

export const Route = createFileRoute("/admin/")({
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

function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery(adminProductsQueryOptions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProductRow | null>(null);

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

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (p: AdminProductRow) => {
    setEditing(p);
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            Altere preços, imagens e disponibilidade. As mudanças refletem na loja na hora.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus /> Novo produto
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Visível</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum produto cadastrado ainda.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.image_url}
                      alt=""
                      className="size-12 rounded-md border border-border object-cover"
                    />
                    <div>
                      <p className="font-bold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.club} • /{p.slug}
                      </p>
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
                  <Switch
                    checked={p.active}
                    onCheckedChange={(v) => toggleActive.mutate({ id: p.id, active: v })}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => openEdit(p)}
                      aria-label="Editar"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Remover"
                      onClick={() => {
                        if (confirm(`Remover "${p.name}"? Essa ação não pode ser desfeita.`)) {
                          removeProduct.mutate(p.id);
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductFormDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />
    </div>
  );
}
