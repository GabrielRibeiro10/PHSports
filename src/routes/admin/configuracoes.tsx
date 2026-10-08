import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DatabaseBackup, Loader2, Megaphone, Save } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, PageHeader } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { operationSettingsQuery, saveOperationSettings, type OperationSettings } from "@/lib/adminOrders";
import { STORE_PHONE } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { announcementQuery, MAX_TEXT, safeHref } from "@/lib/announcement";
import { saveSetting } from "@/lib/adminData";
import { downloadBackup } from "@/lib/backup";

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

function AnnouncementCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-aviso"],
    queryFn: async () => {
      const { data: row } = await supabase.from("store_settings").select("value").eq("key", "aviso").maybeSingle();
      return (row?.value ?? {}) as Record<string, string>;
    },
  });
  const [v, setV] = useState<Record<string, string>>({ active: "0", text: "", href: "", label: "" });
  useEffect(() => { if (data) setV({ active: "0", text: "", href: "", label: "", ...data }); }, [data]);
  const hrefOk = !v.href?.trim() || safeHref(v.href) !== null;
  const save = useMutation({
    mutationFn: () => saveSetting("aviso", { active: v.active === "1" ? "1" : "0", text: (v.text ?? "").trim().slice(0, MAX_TEXT), href: (v.href ?? "").trim(), label: (v.label ?? "").trim().slice(0, 30) }),
    onSuccess: () => { toast.success("Aviso salvo. Já aparece na loja."); void qc.invalidateQueries({ queryKey: ["admin-aviso"] }); void qc.invalidateQueries({ queryKey: announcementQuery.queryKey }); },
    onError: () => toast.error("Não foi possível salvar o aviso."),
  });
  return (
    <AdminCard className="mt-4 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold"><Megaphone className="size-4" /> Aviso no topo da loja</h2>
      <p className="mb-4 text-sm text-muted-foreground">Uma faixa colorida acima do menu, para promoção, prazo de envio ou recado. Aparece em todas as páginas da loja.</p>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
        <form className="grid max-w-2xl gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={v.active === "1"} onChange={(e) => setV({ ...v, active: e.target.checked ? "1" : "0" })} /> Mostrar o aviso na loja
          </label>
          <div className="grid gap-1.5">
            <Label htmlFor="av-text">Texto ({(v.text ?? "").length}/{MAX_TEXT})</Label>
            <Input id="av-text" maxLength={MAX_TEXT} value={v.text ?? ""} onChange={(e) => setV({ ...v, text: e.target.value })} placeholder="Ex.: Camisas retrô com 10% de desconto até domingo" />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="grid gap-1.5">
              <Label htmlFor="av-href">Link (opcional)</Label>
              <Input id="av-href" value={v.href ?? ""} onChange={(e) => setV({ ...v, href: e.target.value })} placeholder="/categoria/retro ou https://…" />
              {!hrefOk && <p className="text-xs text-destructive">Use um caminho do site (começando com /) ou um link https://.</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="av-label">Texto do link</Label>
              <Input id="av-label" maxLength={30} value={v.label ?? ""} onChange={(e) => setV({ ...v, label: e.target.value })} placeholder="Ver agora" />
            </div>
          </div>
          <div><Button type="submit" disabled={save.isPending || !hrefOk}>{save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Salvar aviso</Button></div>
        </form>
      )}
    </AdminCard>
  );
}

function BackupCard() {
  const [busy, setBusy] = useState("");
  return (
    <AdminCard className="mt-4 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold"><DatabaseBackup className="size-4" /> Cópia de segurança</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Baixa produtos, pedidos, clientes, estoque, cupons e configurações num arquivo. Faça de vez em quando e guarde fora do computador (nuvem ou pen drive).
        O arquivo tem dados de clientes: não envie para ninguém que não seja de confiança.
      </p>
      <Button
        variant="outline"
        disabled={!!busy}
        onClick={() => {
          setBusy("preparando");
          downloadBackup((t) => setBusy(t))
            .then((c) => toast.success(`Backup baixado: ${c.orders ?? 0} pedidos, ${c.products ?? 0} produtos`))
            .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível gerar o backup."))
            .finally(() => setBusy(""));
        }}
      >
        {busy ? <Loader2 className="animate-spin" /> : <DatabaseBackup />} {busy ? `Lendo ${busy}…` : "Baixar cópia de segurança"}
      </Button>
    </AdminCard>
  );
}

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
      <AnnouncementCard />
      <BackupCard />
    </div>
  );
}
