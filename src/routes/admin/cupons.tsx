import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Ticket, Trash2 } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, EmptyState, PageHeader, TableSkeleton } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { couponsQueryOptions, deleteCoupon, upsertCoupon } from "@/lib/adminData";

export const Route = createFileRoute("/admin/cupons")({
  head: () => ({
    meta: [{ title: "Cupons — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <CouponsPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

const empty = {
  code: "",
  discount_type: "percent",
  discount_value: "10",
  expires_at: "",
  max_uses: "0",
  min_order_value: "0",
};

function CouponsPage() {
  const qc = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery(couponsQueryOptions);
  const [form, setForm] = useState(empty);
  const invalidate = () => qc.invalidateQueries({ queryKey: couponsQueryOptions.queryKey });

  const create = useMutation({
    mutationFn: () =>
      upsertCoupon(null, {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        expires_at: form.expires_at || null,
        max_uses: Number(form.max_uses) || 0,
        min_order_value: Number(form.min_order_value) || 0,
        active: true,
      }),
    onSuccess: () => {
      toast.success("Cupom criado");
      setForm(empty);
      invalidate();
    },
    onError: () => toast.error("Não foi possível criar o cupom"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      upsertCoupon(id, { active } as never),
    onSuccess: invalidate,
    onError: () => toast.error("Não foi possível atualizar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      toast.success("Cupom removido");
      invalidate();
    },
    onError: () => toast.error("Não foi possível remover"),
  });

  return (
    <div>
      <PageHeader title="Cupons" description="Crie e gerencie cupons de desconto da loja." />

      <AdminCard className="mb-4 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="grid items-end gap-3 md:grid-cols-3 xl:grid-cols-7"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="c-code">Código</Label>
            <Input id="c-code" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-type">Tipo</Label>
            <Select value={form.discount_type} onValueChange={(v) => setForm((f) => ({ ...f, discount_type: v }))}>
              <SelectTrigger id="c-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentual (%)</SelectItem>
                <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-value">Valor</Label>
            <Input id="c-value" type="number" step="0.01" min="0" value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-exp">Validade</Label>
            <Input id="c-exp" type="date" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-max">Máx. usos</Label>
            <Input id="c-max" type="number" min="0" value={form.max_uses} onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-min">Valor mínimo</Label>
            <Input id="c-min" type="number" step="0.01" min="0" value={form.min_order_value} onChange={(e) => setForm((f) => ({ ...f, min_order_value: e.target.value }))} />
          </div>
          <Button type="submit" disabled={create.isPending}><Plus /> Criar</Button>
        </form>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={3} cols={4} />
        ) : coupons.length === 0 ? (
          <EmptyState icon={<Ticket className="size-5" />} title="Nenhum cupom criado" description="Crie o primeiro cupom no formulário acima." />
        ) : (
          <ul className="divide-y divide-border">
            {coupons.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <span className="rounded-lg bg-secondary px-2.5 py-1 font-black tracking-wide">{c.code}</span>
                <span className="text-sm font-semibold">
                  {c.discount_type === "percent" ? `${c.discount_value}%` : `R$ ${c.discount_value}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.expires_at ? `até ${new Date(c.expires_at).toLocaleDateString("pt-BR")}` : "sem validade"} •
                  {" "}{c.used_count}/{c.max_uses || "∞"} usos • mín. R$ {c.min_order_value}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <Switch checked={c.active} onCheckedChange={(v) => toggle.mutate({ id: c.id, active: v })} />
                  <Button size="icon" variant="outline" aria-label="Remover" onClick={() => remove.mutate(c.id)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
