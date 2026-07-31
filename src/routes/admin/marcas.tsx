import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, EmptyState, PageHeader, TableSkeleton } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageSlot } from "@/components/admin/ImageSlot";
import { slugify, uploadBrandImage } from "@/lib/adminCatalog";
import { brandsQueryOptions, deleteBrand, upsertBrand, type BrandRow } from "@/lib/adminData";

export const Route = createFileRoute("/admin/marcas")({
  head: () => ({
    meta: [{ title: "Marcas — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <BrandsPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

function BrandsPage() {
  const qc = useQueryClient();
  const { data: brands = [], isLoading } = useQuery(brandsQueryOptions);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: brandsQueryOptions.queryKey });

  const create = useMutation({
    mutationFn: () =>
      upsertBrand(null, { name: name.trim(), slug: slugify(name), logo_url: logo, active: true }),
    onSuccess: () => {
      toast.success("Marca criada");
      setName("");
      setLogo("");
      invalidate();
    },
    onError: () => toast.error("Não foi possível criar a marca"),
  });

  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<BrandRow> }) =>
      upsertBrand(id, values as never),
    onSuccess: invalidate,
    onError: () => toast.error("Não foi possível salvar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: () => {
      toast.success("Marca removida");
      invalidate();
    },
    onError: () => toast.error("Não foi possível remover"),
  });

  return (
    <div>
      <PageHeader title="Marcas" description="Gerencie as marcas exibidas nos produtos." />

      <AdminCard className="mb-4 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="grid items-end gap-3 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
        >
          <ImageSlot label="Logo" value={logo} onChange={setLogo} upload={(f) => uploadBrandImage(f, name || "marca")} />
          <div className="grid gap-1.5">
            <Label htmlFor="brand-name">Nome da marca</Label>
            <Input id="brand-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button type="submit" disabled={create.isPending}>
            <Plus /> Adicionar
          </Button>
        </form>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={3} cols={3} />
        ) : brands.length === 0 ? (
          <EmptyState title="Nenhuma marca cadastrada" description="Adicione a primeira marca acima." />
        ) : (
          <ul className="divide-y divide-border">
            {brands.map((b) => (
              <li key={b.id} className="flex items-center gap-4 px-4 py-3">
                {b.logo_url ? (
                  <img src={b.logo_url} alt="" className="size-10 rounded-lg border border-border object-contain" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-lg bg-secondary text-xs font-black">
                    {b.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-bold">{b.name}</span>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  Ativa
                  <Switch
                    checked={b.active}
                    onCheckedChange={(v) => update.mutate({ id: b.id, values: { active: v } })}
                  />
                </div>
                <Button size="icon" variant="outline" aria-label="Remover" onClick={() => remove.mutate(b.id)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
