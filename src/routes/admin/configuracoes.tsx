import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, PageHeader } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { operationSettingsQuery, saveOperationSettings, type OperationSettings } from "@/lib/adminOrders";
import { STORE_PHONE } from "@/lib/products";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({
    meta: [{ title: "Configurações — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <SettingsPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(operationSettingsQuery);
  const [v, setV] = useState<OperationSettings>({});
  useEffect(() => {
    if (data) setV(data);
  }, [data]);

  const digits = (v.whatsapp ?? "").replace(/\D/g, "");
  const phoneOk = digits === "" || /^55\d{10,11}$/.test(digits);
  const lowOk = (v.low_stock ?? "") === "" || /^\d{1,4}$/.test(v.low_stock ?? "");

  const save = useMutation({
    mutationFn: () => saveOperationSettings({ ...v, whatsapp: digits }),
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: operationSettingsQuery.queryKey });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Dados usados de verdade na operação. Senhas e tokens não ficam aqui: ficam nos segredos da hospedagem."
      />
      <AdminCard className="p-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <form
            className="grid max-w-2xl gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="cfg-wa">WhatsApp da loja (com DDI 55 e DDD)</Label>
              <Input id="cfg-wa" inputMode="tel" placeholder="55 12 99999-0000" value={v.whatsapp ?? ""} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} />
              <p className={`text-xs ${phoneOk ? "text-muted-foreground" : "text-destructive"}`}>
                {phoneOk
                  ? `Os pedidos do “Finalizar pelo WhatsApp” vão sempre para o número da loja (${STORE_PHONE}); este campo não muda isso.`
                  : "Use 55 + DDD + número (12 ou 13 dígitos)."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="cfg-pix">Chave Pix</Label>
                <Input id="cfg-pix" value={v.pix_key ?? ""} onChange={(e) => setV({ ...v, pix_key: e.target.value })} maxLength={120} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cfg-owner">Titular da chave</Label>
                <Input id="cfg-owner" value={v.pix_owner ?? ""} onChange={(e) => setV({ ...v, pix_owner: e.target.value })} maxLength={120} />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Usados no botão “Enviar dados do Pix” do pedido (mensagem para o cliente). A confirmação continua manual.
              </p>
            </div>
            <div className="grid max-w-xs gap-1.5">
              <Label htmlFor="cfg-low">Alerta de estoque baixo (unidades)</Label>
              <Input id="cfg-low" inputMode="numeric" placeholder="3" value={v.low_stock ?? ""} onChange={(e) => setV({ ...v, low_stock: e.target.value.replace(/\D/g, "") })} />
            </div>
            <p className="text-xs text-muted-foreground">
              Frete: configure em <Link to="/admin/fretes" className="underline">Fretes</Link>.
            </p>
            <div>
              <Button type="submit" disabled={save.isPending || !phoneOk || !lowOk}>
                {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Salvar
              </Button>
            </div>
          </form>
        )}
      </AdminCard>
    </div>
  );
}
