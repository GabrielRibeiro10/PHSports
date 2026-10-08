// Cópia de segurança: baixa os dados da loja num único arquivo (só o admin consegue ler essas tabelas).
import { supabase } from "@/integrations/supabase/client";
import { downloadFile } from "@/lib/csv";

export const BACKUP_TABLES = [
  "products", "categories", "brands", "product_stock", "stock_movements", "orders", "order_items", "order_events",
  "customers", "coupons", "reviews", "shipping_zones", "store_settings",
] as const;

async function readAll(table: string) {
  const out: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table as never).select("*").range(from, from + 999);
    if (error) throw new Error(`Não foi possível ler “${table}”.`);
    out.push(...((data ?? []) as unknown[]));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
}

export async function downloadBackup(onProgress?: (table: string) => void) {
  const tables: Record<string, unknown[]> = {};
  for (const t of BACKUP_TABLES) {
    onProgress?.(t);
    tables[t] = await readAll(t);
  }
  const counts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));
  const file = { app: "phsports", version: 1, createdAt: new Date().toISOString(), counts, tables };
  downloadFile(`backup-phsports-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(file), "application/json");
  return counts;
}
