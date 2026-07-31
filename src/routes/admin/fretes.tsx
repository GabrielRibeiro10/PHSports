import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Truck } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, EmptyState, PageHeader, TableSkeleton } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  deleteShipping,
  shippingQueryOptions,
  upsertShipping,
  type ShippingRow,
} from "@/lib/adminData";

export const Route = createFileRoute("/admin/fretes")({
  head: () => ({
    meta: [{ title: "Fretes — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <ShippingPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

function ShippingPage() {
  const qc = useQueryClient();
  const { data: zones = [], isLoading } = useQuery(shippingQueryOptions);
  const [region, setRegion] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: shippingQueryOptions.queryKey });

  const create = useMutation({
    mutationFn: () => upsertShipping(null, { region: region.trim() }),
    onSuccess: () => {
      toast.success("Região adicionada");
      setRegion("");
      invalidate();
    },
    onError: () => toast.error("Não foi possível adicionar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteShipping(id),
    onSuccess: () => {
      toast.success("Região removida");
      invalidate();
    },
    onError: () => toast.error("Não foi possível remover"),
  });

  return (
    <div>
      <PageHeader title="Fretes" description="Configure valor, prazo e frete grátis por região atendida." />

      <AdminCard className="mb-4 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="grid min-w-56 flex-1 gap-1.5">
            <Label htmlFor="s-region">Nova região atendida</Label>
            <Input id="s-region" required value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <Button type="submit" disabled={create.isPending}><Plus /> Adicionar</Button>
        </form>
      </AdminCard>

      {isLoading ? (
        <AdminCard><TableSkeleton rows={4} cols={4} /></AdminCard>
      ) : zones.length === 0 ? (
        <AdminCard>
          <EmptyState icon={<Truck className="size-5" />} title="Nenhuma região configurada" />
        </AdminCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {zones.map((z) => (
            <ZoneCard key={z.id} zone={z} onRemove={() => remove.mutate(z.id)} onSaved={invalidate} />
          ))}
        </div>
      )}
    </div>
  );
}

function ZoneCard({
  zone,
  onRemove,
  onSaved,
}: {
  zone: ShippingRow;
  onRemove: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    region: zone.region,
    price: String(zone.price),
    free_above: String(zone.free_above),
    delivery_days: zone.delivery_days,
    active: zone.active,
  });

  const save = useMutation({
    mutationFn: () =>
      upsertShipping(zone.id, {
        region: form.region,
        price: Number(form.price) || 0,
        free_above: Number(form.free_above) || 0,
        delivery_days: form.delivery_days,
        active: form.active,
      }),
    onSuccess: () => {
      toast.success(`${form.region} atualizada`);
      onSaved();
    },
    onError: () => toast.error("Não foi possível salvar"),
  });

  return (
    <AdminCard className="p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="grid gap-3"
      >
        <div className="grid gap-1.5">
          <Label>Região</Label>
          <Input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label>Frete grátis acima de (R$)</Label>
            <Input type="number" step="0.01" min="0" value={form.free_above} onChange={(e) => setForm((f) => ({ ...f, free_above: e.target.value }))} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Prazo</Label>
          <Input value={form.delivery_days} onChange={(e) => setForm((f) => ({ ...f, delivery_days: e.target.value }))} />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
          <Label>Ativa</Label>
          <Button type="submit" size="sm" className="ml-auto" disabled={save.isPending}>Salvar</Button>
          <Button type="button" size="icon" variant="outline" aria-label="Remover" onClick={onRemove}>
            <Trash2 />
          </Button>
        </div>
      </form>
    </AdminCard>
  );
}
