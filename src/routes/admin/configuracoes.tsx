import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, PageHeader } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveSetting, settingsQueryOptions } from "@/lib/adminData";

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

const GROUPS: { key: string; label: string; fields: { name: string; label: string }[] }[] = [
  { key: "geral", label: "Geral", fields: [
    { name: "site_name", label: "Nome do site" },
    { name: "tagline", label: "Slogan" },
  ] },
  { key: "loja", label: "Loja", fields: [
    { name: "currency", label: "Moeda" },
    { name: "opening_hours", label: "Horário de atendimento" },
  ] },
  { key: "contato", label: "Contato", fields: [
    { name: "email", label: "E-mail" },
    { name: "address", label: "Endereço" },
  ] },
  { key: "whatsapp", label: "WhatsApp", fields: [
    { name: "phone", label: "Número (com DDI)" },
    { name: "default_message", label: "Mensagem padrão" },
  ] },
  { key: "pagamentos", label: "Pagamentos", fields: [
    { name: "pix_key", label: "Chave Pix" },
    { name: "pix_owner", label: "Titular da chave" },
  ] },
  { key: "frete", label: "Frete", fields: [
    { name: "default_price", label: "Valor padrão (R$)" },
    { name: "free_above", label: "Frete grátis acima de (R$)" },
  ] },
  { key: "seo", label: "SEO", fields: [
    { name: "title", label: "Título padrão" },
    { name: "description", label: "Meta descrição" },
  ] },
  { key: "redes", label: "Redes sociais", fields: [
    { name: "instagram", label: "Instagram" },
    { name: "facebook", label: "Facebook" },
  ] },
  { key: "usuarios", label: "Usuários", fields: [
    { name: "admin_emails", label: "E-mails com acesso administrativo" },
  ] },
  { key: "backup", label: "Backup", fields: [
    { name: "frequency", label: "Frequência de backup" },
  ] },
  { key: "seguranca", label: "Segurança", fields: [
    { name: "session_timeout", label: "Expiração de sessão (minutos)" },
    { name: "login_attempts", label: "Máximo de tentativas de login" },
  ] },
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings = {} } = useQuery(settingsQueryOptions);

  return (
    <div>
      <PageHeader title="Configurações" description="Todas as preferências da loja organizadas em abas." />
      <Tabs defaultValue="geral">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {GROUPS.map((g) => (
            <TabsTrigger key={g.key} value={g.key}>{g.label}</TabsTrigger>
          ))}
        </TabsList>
        {GROUPS.map((g) => (
          <TabsContent key={g.key} value={g.key}>
            <GroupForm
              group={g}
              initial={settings[g.key] ?? {}}
              onSaved={() => qc.invalidateQueries({ queryKey: settingsQueryOptions.queryKey })}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function GroupForm({
  group,
  initial,
  onSaved,
}: {
  group: (typeof GROUPS)[number];
  initial: Record<string, string>;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);

  const save = useMutation({
    mutationFn: () => saveSetting(group.key, values),
    onSuccess: () => {
      toast.success(`${group.label} salvo`);
      onSaved();
    },
    onError: () => toast.error("Não foi possível salvar as configurações"),
  });

  return (
    <AdminCard className="p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {group.fields.map((f) => (
          <div key={f.name} className="grid gap-1.5">
            <Label htmlFor={`${group.key}-${f.name}`}>{f.label}</Label>
            <Input
              id={`${group.key}-${f.name}`}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </AdminCard>
  );
}
