// Produtos em lote: exportar/importar planilha, ajustar preço, ocultar/mostrar e duplicar.
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { writeAudit } from "@/lib/audit";
import { parseCsv, parseNumberBR, toCsv, type CsvColumn } from "@/lib/csv";
import { slugify, type AdminProductRow } from "@/lib/adminCatalog";

type Category = AdminProductRow["category"];
const CATEGORIES: Category[] = ["masculino", "feminino", "retro", "caneleiras", "jogador"];
const CATEGORY_LABEL: Record<Category, string> = { masculino: "Masculino", feminino: "Feminino", retro: "Retrô", caneleiras: "Caneleiras", jogador: "Versão jogador" };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const discountOf = (price: number, old: number) => (!old || old <= price ? 0 : Math.round(((old - price) / old) * 100));
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ───────────────────────── preço ───────────────────────── */

export type PriceAdjust = { mode: "percent"; value: number } | { mode: "fixed"; value: number };

/** Novo preço em reais (2 casas). Nunca fica abaixo de R$ 1,00 e recusa valores absurdos. */
export function adjustPrice(price: number, adj: PriceAdjust): number {
  if (!Number.isFinite(adj.value)) throw new Error("Informe um número válido.");
  const next = adj.mode === "percent" ? price * (1 + adj.value / 100) : price + adj.value;
  if (!Number.isFinite(next) || next > 100000) throw new Error("O novo preço ficaria fora do permitido.");
  return Math.max(1, round2(next));
}

export async function bulkAdjustPrice(rows: AdminProductRow[], adj: PriceAdjust) {
  const updates = rows.map((p) => {
    const price = adjustPrice(Number(p.price), adj);
    return { id: p.id, price, discount: discountOf(price, Number(p.old_price)) };
  });
  for (const u of updates) {
    const { error } = await supabase.from("products").update({ price: u.price, discount: u.discount }).eq("id", u.id);
    if (error) throw new Error("Não foi possível salvar todos os preços. Confira a lista e tente de novo.");
  }
  void writeAudit("product.update", { entity: "products", metadata: { bulk: true, count: rows.length, adjust: adj } });
  return updates.length;
}

export async function bulkSetActive(ids: string[], active: boolean) {
  const { error } = await supabase.from("products").update({ active }).in("id", ids);
  if (error) throw new Error("Não foi possível atualizar a visibilidade.");
  void writeAudit("product.toggle_active", { entity: "products", metadata: { bulk: true, count: ids.length, active } });
}

/* ───────────────────────── duplicar ───────────────────────── */

export function uniqueSlug(base: string, taken: Set<string>) {
  const root = slugify(base) || "produto";
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
  return `${root}-${Date.now()}`;
}

/** Cópia oculta da loja (para você ajustar nome, fotos e preço antes de publicar). Estoque começa zerado. */
export async function duplicateProduct(p: AdminProductRow, takenSlugs: Set<string>) {
  const slug = uniqueSlug(`${p.slug}-copia`, takenSlugs);
  const copy: TablesInsert<"products"> = {
    slug, name: `${p.name} (cópia)`, club: p.club, category: p.category, brand_id: p.brand_id,
    image_url: p.image_url, image_url_2: p.image_url_2, image_url_3: p.image_url_3, image_url_4: p.image_url_4,
    price: p.price, old_price: p.old_price, discount: p.discount, colors: p.colors, sizes: p.sizes,
    description: p.description, sort_order: p.sort_order, featured: false, active: false, stock: 0,
  };
  const { error } = await supabase.from("products").insert(copy);
  if (error) throw new Error("Não foi possível duplicar o produto.");
  void writeAudit("product.create", { entity: "products", metadata: { duplicatedFrom: p.slug, slug } });
  return slug;
}

/* ───────────────────────── exportar ───────────────────────── */

export const PRODUCT_COLUMNS: CsvColumn<AdminProductRow>[] = [
  { header: "slug", value: (p) => p.slug },
  { header: "nome", value: (p) => p.name },
  { header: "clube", value: (p) => p.club },
  { header: "categoria", value: (p) => CATEGORY_LABEL[p.category] ?? p.category },
  { header: "preco", value: (p) => Number(p.price) },
  { header: "preco_antigo", value: (p) => (Number(p.old_price) > 0 ? Number(p.old_price) : "") },
  { header: "visivel", value: (p) => (p.active ? "sim" : "nao") },
  { header: "destaque", value: (p) => (p.featured ? "sim" : "nao") },
  { header: "tamanhos", value: (p) => (p.sizes ?? []).join(" ") },
];
export const productsToCsv = (rows: AdminProductRow[]) => toCsv(rows, PRODUCT_COLUMNS);

/** Modelo para o dono preencher: cabeçalho e uma linha de exemplo. */
export const PRODUCT_TEMPLATE_CSV = toCsv(
  [{ slug: "camisa-exemplo-home", nome: "Camisa Exemplo Home 25/26", clube: "Exemplo FC", categoria: "Masculino", preco: 199.9, preco_antigo: 249.9, visivel: "sim", destaque: "nao", tamanhos: "P M G GG" }],
  ["slug", "nome", "clube", "categoria", "preco", "preco_antigo", "visivel", "destaque", "tamanhos"].map((h) => ({ header: h, value: (r: Record<string, string | number>) => r[h] })),
);

/* ───────────────────────── importar ───────────────────────── */

export type ImportRow = {
  line: number;
  slug: string;
  name?: string;
  club?: string;
  category?: Category;
  price?: number;
  old_price?: number;
  active?: boolean;
  featured?: boolean;
  sizes?: string[];
};
export type ImportPlan = { creates: ImportRow[]; updates: (ImportRow & { id: string })[]; errors: { line: number; message: string }[] };

const ALIASES: Record<string, string> = {
  slug: "slug", nome: "name", name: "name", clube: "club", time: "club", categoria: "category",
  preco: "price", valor: "price", preco_antigo: "old_price", "preco antigo": "old_price", de: "old_price",
  visivel: "active", ativo: "active", destaque: "featured", tamanhos: "sizes", tamanho: "sizes",
};
const yes = (s: string) => ["sim", "s", "1", "true", "verdadeiro", "yes", "x"].includes(norm(s));
const no = (s: string) => ["nao", "n", "0", "false", "falso", "no", ""].includes(norm(s));

export function parseProductCsv(text: string, existing: AdminProductRow[]): ImportPlan {
  const plan: ImportPlan = { creates: [], updates: [], errors: [] };
  const table = parseCsv(text);
  if (table.length < 2) { plan.errors.push({ line: 1, message: "A planilha está vazia ou só tem o cabeçalho." }); return plan; }
  const cols = table[0].map((h) => ALIASES[norm(h).replace(/ /g, "_")] ?? ALIASES[norm(h)] ?? "");
  if (!cols.includes("slug") && !cols.includes("name")) { plan.errors.push({ line: 1, message: "Falta a coluna “slug” ou “nome” no cabeçalho." }); return plan; }
  const bySlug = new Map(existing.map((p) => [p.slug, p]));
  const seen = new Set<string>();
  if (table.length > 501) { plan.errors.push({ line: 1, message: "Máximo de 500 produtos por planilha." }); return plan; }

  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const get = (k: string) => { const i = cols.indexOf(k); return i >= 0 ? (cells[i] ?? "").trim() : undefined; };
    const row: ImportRow = { line, slug: "" };
    const err = (message: string) => plan.errors.push({ line, message });
    const name = get("name");
    const slugRaw = get("slug");
    row.slug = slugify(slugRaw || name || "");
    if (!row.slug) return err("Sem slug nem nome.");
    if (seen.has(row.slug)) return err(`Slug repetido na planilha: ${row.slug}`);
    seen.add(row.slug);
    if (name) { if (name.length > 160) return err("Nome muito longo."); row.name = name; }
    const club = get("club"); if (club) row.club = club.slice(0, 120);
    const cat = get("category");
    if (cat) {
      const found = CATEGORIES.find((c) => norm(c) === norm(cat) || norm(CATEGORY_LABEL[c]) === norm(cat));
      if (!found) return err(`Categoria desconhecida: “${cat}”. Use ${CATEGORIES.map((c) => CATEGORY_LABEL[c]).join(", ")}.`);
      row.category = found;
    }
    for (const k of ["price", "old_price"] as const) {
      const raw = get(k);
      if (raw === undefined || raw === "") continue;
      const n = parseNumberBR(raw);
      if (n === null || n < 0 || n > 100000) return err(`Valor inválido em ${k === "price" ? "preço" : "preço antigo"}: “${raw}”.`);
      row[k] = round2(n);
    }
    const active = get("active"); if (active !== undefined && active !== "") { if (yes(active)) row.active = true; else if (no(active)) row.active = false; else return err(`Visível deve ser sim ou não (veio “${active}”).`); }
    const featured = get("featured"); if (featured !== undefined && featured !== "") { if (yes(featured)) row.featured = true; else if (no(featured)) row.featured = false; else return err(`Destaque deve ser sim ou não (veio “${featured}”).`); }
    const sizes = get("sizes"); if (sizes) row.sizes = sizes.split(/[\s,/]+/).map((s) => s.toUpperCase()).filter(Boolean).slice(0, 12);

    const found = bySlug.get(row.slug);
    if (found) {
      if (row.price !== undefined && row.price < 1) return err("Preço precisa ser de pelo menos R$ 1,00.");
      plan.updates.push({ ...row, id: found.id });
    } else {
      if (!row.name || !row.club || !row.category || row.price === undefined) return err("Produto novo precisa de nome, clube, categoria e preço.");
      if (row.price < 1) return err("Preço precisa ser de pelo menos R$ 1,00.");
      plan.creates.push(row);
    }
  });
  return plan;
}

export async function applyImport(plan: ImportPlan, existing: AdminProductRow[]) {
  const byId = new Map(existing.map((p) => [p.id, p]));
  for (const r of plan.updates) {
    const cur = byId.get(r.id)!;
    const price = r.price ?? Number(cur.price);
    const old = r.old_price ?? Number(cur.old_price);
    const patch: TablesUpdate<"products"> = { price, old_price: old, discount: discountOf(price, old) };
    if (r.name) patch.name = r.name;
    if (r.club) patch.club = r.club;
    if (r.category) patch.category = r.category;
    if (r.active !== undefined) patch.active = r.active;
    if (r.featured !== undefined) patch.featured = r.featured;
    if (r.sizes) patch.sizes = r.sizes;
    const { error } = await supabase.from("products").update(patch).eq("id", r.id);
    if (error) throw new Error(`Falhou ao atualizar “${r.slug}”. O que veio antes já foi salvo.`);
  }
  if (plan.creates.length) {
    const rows: TablesInsert<"products">[] = plan.creates.map((r) => ({
      slug: r.slug, name: r.name!, club: r.club!, category: r.category!, price: r.price!, old_price: r.old_price ?? 0,
      discount: discountOf(r.price!, r.old_price ?? 0), active: r.active ?? false, featured: r.featured ?? false,
      sizes: r.sizes ?? null, stock: 0,
    }));
    const { error } = await supabase.from("products").insert(rows);
    if (error) throw new Error("Não foi possível criar os produtos novos (algum slug pode já existir).");
  }
  void writeAudit("product.update", { entity: "products", metadata: { import: true, updated: plan.updates.length, created: plan.creates.length } });
}
