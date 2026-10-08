import { useState } from "react";
import { toast } from "sonner";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadCsv } from "@/lib/csv";
import { formatBRL } from "@/lib/products";
import type { AdminProductRow } from "@/lib/adminCatalog";
import { adjustPrice, applyImport, bulkAdjustPrice, parseProductCsv, PRODUCT_TEMPLATE_CSV, type ImportPlan, type PriceAdjust } from "@/lib/productBulk";

const MAX_FILE = 1024 * 1024; // 1 MB é muito para 500 linhas

export function PriceDialog({ rows, open, onOpenChange, onDone }: { rows: AdminProductRow[]; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [mode, setMode] = useState<PriceAdjust["mode"]>("percent");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const n = Number(value.replace(",", "."));
  const valid = value.trim() !== "" && Number.isFinite(n) && n !== 0;
  let preview: { name: string; from: number; to: number }[] = [];
  let problem = "";
  if (valid) {
    try { preview = rows.slice(0, 3).map((p) => ({ name: p.name, from: Number(p.price), to: adjustPrice(Number(p.price), { mode, value: n }) })); } catch (e) { problem = e instanceof Error ? e.message : "Valor inválido."; }
  }
  const apply = async () => {
    setBusy(true);
    try {
      const count = await bulkAdjustPrice(rows, { mode, value: n });
      toast.success(`Preço atualizado em ${count} ${count === 1 ? "produto" : "produtos"}`);
      onOpenChange(false); setValue(""); onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível ajustar os preços."); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar preço de {rows.length} {rows.length === 1 ? "produto" : "produtos"}</DialogTitle>
          <DialogDescription>O preço antigo (riscado) não muda. Use um número negativo para baixar o preço.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex gap-2" role="radiogroup" aria-label="Tipo de ajuste">
            <Button type="button" size="sm" variant={mode === "percent" ? "default" : "outline"} onClick={() => setMode("percent")}>Porcentagem (%)</Button>
            <Button type="button" size="sm" variant={mode === "fixed" ? "default" : "outline"} onClick={() => setMode("fixed")}>Valor em R$</Button>
          </div>
          <div>
            <Label htmlFor="adj">{mode === "percent" ? "Porcentagem (ex.: 10 ou -15)" : "Valor em reais (ex.: 20 ou -10)"}</Label>
            <Input id="adj" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === "percent" ? "-10" : "-20"} />
          </div>
          {problem ? <p className="text-sm text-destructive">{problem}</p> : preview.length > 0 && (
            <ul className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
              {preview.map((p) => (
                <li key={p.name} className="flex justify-between gap-3"><span className="truncate">{p.name}</span><span className="shrink-0 font-semibold">{formatBRL(p.from)} → {formatBRL(p.to)}</span></li>
              ))}
              {rows.length > 3 && <li className="mt-1 text-xs text-muted-foreground">e mais {rows.length - 3}…</li>}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid || !!problem || busy} onClick={() => void apply()}>{busy ? "Aplicando…" : "Aplicar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ImportDialog({ products, open, onOpenChange, onDone }: { products: AdminProductRow[]; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const reset = () => { setPlan(null); setFileName(""); };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE) { toast.error("Arquivo grande demais (máximo 1 MB)."); return; }
    if (!/\.(csv|txt)$/i.test(file.name)) { toast.error("Envie um arquivo .csv (no Excel: Salvar como → CSV)."); return; }
    setFileName(file.name);
    setPlan(parseProductCsv(await file.text(), products));
  };
  const total = plan ? plan.creates.length + plan.updates.length : 0;
  const apply = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await applyImport(plan, products);
      toast.success(`Importação concluída: ${plan.updates.length} atualizados, ${plan.creates.length} novos`);
      onOpenChange(false); reset(); onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível importar."); onDone(); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar planilha de produtos</DialogTitle>
          <DialogDescription>
            Produtos com o mesmo slug são atualizados (só as colunas que você preencher); os outros são criados <b>ocultos</b> da loja, para você revisar as fotos antes de publicar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => downloadCsv("modelo-produtos.csv", PRODUCT_TEMPLATE_CSV)}>Baixar planilha modelo</Button>
          <div>
            <Label htmlFor="imp-file">Arquivo .csv</Label>
            <Input id="imp-file" type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void onFile(e.target.files?.[0])} />
          </div>
          {plan && (
            <div className="rounded-lg border border-border bg-secondary/40 p-3" aria-live="polite">
              <p className="font-semibold">{fileName}</p>
              <p>{plan.updates.length} para atualizar · {plan.creates.length} novos · <span className={plan.errors.length ? "font-bold text-destructive" : ""}>{plan.errors.length} com erro</span></p>
              {plan.errors.length > 0 && (
                <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-xs text-destructive">
                  {plan.errors.slice(0, 20).map((e) => <li key={`${e.line}-${e.message}`}>Linha {e.line}: {e.message}</li>)}
                  {plan.errors.length > 20 && <li>e mais {plan.errors.length - 20} erros…</li>}
                </ul>
              )}
              {plan.errors.length > 0 && total > 0 && <p className="mt-2 text-xs text-muted-foreground">As linhas com erro serão ignoradas; as demais serão importadas.</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!plan || total === 0 || busy} onClick={() => void apply()}><FileUp /> {busy ? "Importando…" : `Importar ${total || ""}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
