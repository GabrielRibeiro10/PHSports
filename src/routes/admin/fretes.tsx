import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Truck } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, PageHeader } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { writeAudit } from "@/lib/audit";
import { productsQueryOptions } from "@/lib/catalog";
import { formatBRL, type CategoryId } from "@/lib/products";
import { quoteShipping } from "@/lib/shipping.functions";
import { maskCep } from "@/lib/shipping/cep";
import { parseSettings } from "@/lib/shipping/package";
import type { QuoteResult } from "@/lib/shipping/types";

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

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "masculino", label: "Camisa torcedor" },
  { id: "feminino", label: "Camisa feminina" },
  { id: "jogador", label: "Versão jogador" },
  { id: "retro", label: "Retrô" },
  { id: "caneleiras", label: "Acessórios (caneleiras)" },
];

type Form = {
  origin_cep: string;
  prep_days: string;
  box: { length_cm: string; width_cm: string; base_height_cm: string; empty_weight_g: string };
  items: Record<CategoryId, { weight_g: string; thickness_cm: string }>;
};

const emptyForm = (): Form => ({
  origin_cep: "",
  prep_days: "",
  box: { length_cm: "", width_cm: "", base_height_cm: "", empty_weight_g: "" },
  items: Object.fromEntries(CATEGORIES.map((c) => [c.id, { weight_g: "", thickness_cm: "" }])) as Form["items"],
});

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

const settingsQuery = {
  queryKey: ["admin-shipping-settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("store_settings").select("value").eq("key", "shipping").maybeSingle();
    if (error) throw error;
    return (data?.value ?? {}) as Record<string, unknown>;
  },
};

function ShippingPage() {
  const qc = useQueryClient();
  const { data: saved, isLoading } = useQuery(settingsQuery);
  const [form, setForm] = useState<Form>(emptyForm);

  useEffect(() => {
    if (!saved) return;
    const f = emptyForm();
    const box = (saved.box ?? {}) as Record<string, unknown>;
    const items = (saved.items ?? {}) as Record<string, Record<string, unknown>>;
    f.origin_cep = maskCep(str(saved.origin_cep));
    f.prep_days = str(saved.prep_days);
    f.box = { length_cm: str(box.length_cm), width_cm: str(box.width_cm), base_height_cm: str(box.base_height_cm), empty_weight_g: str(box.empty_weight_g) };
    for (const c of CATEGORIES) f.items[c.id] = { weight_g: str(items[c.id]?.weight_g), thickness_cm: str(items[c.id]?.thickness_cm) };
    setForm(f);
  }, [saved]);

  const value = {
    origin_cep: form.origin_cep.replace(/\D/g, ""),
    prep_days: n(form.prep_days) ?? 0,
    box: {
      length_cm: n(form.box.length_cm),
      width_cm: n(form.box.width_cm),
      base_height_cm: n(form.box.base_height_cm),
      empty_weight_g: n(form.box.empty_weight_g),
    },
    items: Object.fromEntries(
      CATEGORIES.map((c) => [c.id, { weight_g: n(form.items[c.id].weight_g), thickness_cm: n(form.items[c.id].thickness_cm) }]).filter(
        ([, v]) => (v as { weight_g: number | null }).weight_g != null,
      ),
    ),
  };
  const valid = parseSettings(value);

  const save = useMutation({
    mutationFn: async () => {
      if (!valid) throw new Error("incompleto");
      const { error } = await supabase.from("store_settings").upsert({ key: "shipping", value });
      if (error) throw error;
      void writeAudit("settings.update", { entity: "store_settings", entityId: "shipping" });
    },
    onSuccess: () => {
      toast.success("Configuração de frete salva");
      qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
    },
    onError: () => toast.error("Confira o CEP de origem e as medidas da caixa"),
  });

  const field = (label: string, val: string, set: (v: string) => void, hint?: string, id?: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" value={val} onChange={(e) => set(e.target.value)} />
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Fretes"
        description="Frete real dos Correios (via Melhor Envio ou contrato). Aqui ficam só os dados do pacote; tokens e senhas ficam nos segredos da hospedagem."
      />
      {isLoading ? (
        <AdminCard className="p-6 text-sm text-muted-foreground">Carregando…</AdminCard>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid gap-4"
        >
          <AdminCard className="grid gap-4 p-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="f-origin">CEP de origem (de onde as encomendas saem)</Label>
              <Input id="f-origin" inputMode="numeric" placeholder="00000-000" value={form.origin_cep} onChange={(e) => setForm({ ...form, origin_cep: maskCep(e.target.value) })} />
            </div>
            {field("Tempo de preparação (dias úteis)", form.prep_days, (v) => setForm({ ...form, prep_days: v }), "Mostrado separado do prazo dos Correios. 0 para não mostrar.", "f-prep")}
          </AdminCard>

          <AdminCard className="p-4">
            <h2 className="mb-3 text-sm font-bold">Embalagem (caixa ou envelope usado no envio)</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {field("Comprimento (cm)", form.box.length_cm, (v) => setForm({ ...form, box: { ...form.box, length_cm: v } }), "mínimo 16", "f-len")}
              {field("Largura (cm)", form.box.width_cm, (v) => setForm({ ...form, box: { ...form.box, width_cm: v } }), "mínimo 11", "f-wid")}
              {field("Altura vazia (cm)", form.box.base_height_cm, (v) => setForm({ ...form, box: { ...form.box, base_height_cm: v } }), "a altura cresce com cada peça", "f-hei")}
              {field("Peso da embalagem (g)", form.box.empty_weight_g, (v) => setForm({ ...form, box: { ...form.box, empty_weight_g: v } }), undefined, "f-empty")}
            </div>
          </AdminCard>

          <AdminCard className="p-4">
            <h2 className="mb-1 text-sm font-bold">Peso e espessura de cada peça (dobrada)</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Peso do pacote = embalagem + soma das peças. Altura = altura vazia + espessura de cada peça. Categoria sem peso não pode ser cotada.
            </p>
            <div className="grid gap-3">
              {CATEGORIES.map((c) => (
                <div key={c.id} className="grid items-end gap-3 sm:grid-cols-[1fr_160px_160px]">
                  <p className="text-sm font-semibold">{c.label}</p>
                  {field("Peso (g)", form.items[c.id].weight_g, (v) => setForm({ ...form, items: { ...form.items, [c.id]: { ...form.items[c.id], weight_g: v } } }), undefined, `f-w-${c.id}`)}
                  {field("Espessura (cm)", form.items[c.id].thickness_cm, (v) => setForm({ ...form, items: { ...form.items, [c.id]: { ...form.items[c.id], thickness_cm: v } } }), undefined, `f-t-${c.id}`)}
                </div>
              ))}
            </div>
          </AdminCard>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={save.isPending || !valid}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Salvar configuração
            </Button>
            {!valid && <p className="text-xs text-muted-foreground">Preencha o CEP de origem e as medidas da embalagem.</p>}
          </div>
        </form>
      )}

      <QuoteTester />
    </div>
  );
}

/** Teste de cotação real com a configuração salva e as credenciais da hospedagem. */
function QuoteTester() {
  const quote = useServerFn(quoteShipping);
  const { data: products = [] } = useQuery(productsQueryOptions);
  const [cep, setCep] = useState("");
  const [slug, setSlug] = useState("");
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<QuoteResult | null>(null);

  useEffect(() => {
    if (!slug && products[0]) setSlug(products[0].slug);
  }, [products, slug]);

  const run = async () => {
    setBusy(true);
    setRes(null);
    try {
      setRes(await quote({ data: { cep, items: [{ slug, qty: Math.max(1, Math.min(50, Number(qty) || 1)) }] } }));
    } catch {
      setRes({ ok: false, code: "provider_error", message: "Falha ao consultar." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminCard className="mt-6 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Truck className="size-4" /> Testar cotação
      </h2>
      <div className="grid items-end gap-3 sm:grid-cols-[140px_1fr_90px_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="t-cep">CEP destino</Label>
          <Input id="t-cep" inputMode="numeric" placeholder="00000-000" value={cep} onChange={(e) => setCep(maskCep(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="t-prod">Produto</Label>
          <select id="t-prod" value={slug} onChange={(e) => setSlug(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="t-qty">Qtd.</Label>
          <Input id="t-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} />
        </div>
        <Button type="button" onClick={run} disabled={busy || !slug}>
          {busy ? <Loader2 className="animate-spin" /> : null} Cotar
        </Button>
      </div>
      {res && (
        <div className="mt-4 text-sm">
          {res.ok ? (
            <>
              <p className="mb-2 font-semibold">
                Ambiente: {res.environment === "production" ? "PRODUÇÃO (valores reais)" : "TESTE (sandbox)"} · {res.city}/{res.uf}
              </p>
              <ul className="grid gap-1">
                {res.options.map((o) => (
                  <li key={o.key}>
                    {o.name} ({o.carrier}): <strong>{formatBRL(o.price)}</strong> · {o.days.min}–{o.days.max} dias úteis
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-destructive">
              {res.message} <span className="text-muted-foreground">({res.code})</span>
            </p>
          )}
        </div>
      )}
    </AdminCard>
  );
}
