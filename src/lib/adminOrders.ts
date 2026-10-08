// Painel: leitura de pedidos/estoque (RLS: só admin) e ações via funções do banco
// (cada função confere no servidor se quem chama é admin e aplica as regras).
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OrderRow = Tables<"orders">;
export type OrderItemRow = Tables<"order_items">;
export type OrderEventRow = Tables<"order_events">;
export type StockRow = Tables<"product_stock">;
export type MovementRow = Tables<"stock_movements">;

export type Fulfillment = "aguardando_atendimento" | "em_preparacao" | "enviado" | "entregue" | "cancelado";
export type Payment = "pendente" | "confirmado" | "reembolsado";

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  aguardando_atendimento: "Aguardando atendimento",
  em_preparacao: "Em preparação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
export const PAYMENT_LABEL: Record<Payment, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  reembolsado: "Reembolsado",
};
export const SHIPPING_LABEL: Record<string, string> = {
  pendente: "Frete pendente",
  cotado: "Frete cotado",
  manual: "Frete manual",
};
export const TONE: Record<string, string> = {
  aguardando_atendimento: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  em_preparacao: "bg-sky-500/10 text-sky-700 border-sky-500/25",
  enviado: "bg-indigo-500/10 text-indigo-700 border-indigo-500/25",
  entregue: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  cancelado: "bg-destructive/10 text-destructive border-destructive/25",
  pendente: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  confirmado: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  reembolsado: "bg-muted text-muted-foreground border-border",
};

/** Mensagem do banco (as funções já explicam o motivo em português). */
function fail(e: { message?: string } | null, fallback: string): never {
  const msg = e?.message ?? "";
  if (/permission denied|JWT|not authorized|restrito/i.test(msg)) throw new Error("Sua sessão não tem permissão de administrador. Entre de novo.");
  throw new Error(msg && !/^(fetch|network)/i.test(msg) ? msg : fallback);
}

/* ─────────────────────────── pedidos ─────────────────────────── */

export type OrderFilters = {
  page: number;
  pageSize: number;
  q: string;
  from: string; // yyyy-mm-dd
  to: string;
  payment: "" | Payment;
  fulfillment: "" | Fulfillment;
};

export async function listOrders(f: OrderFilters) {
  let query = supabase.from("orders").select("*", { count: "exact" }).order("created_at", { ascending: false });
  const term = f.q.replace(/[^\p{L}\p{N} -]/gu, "").trim();
  if (term) query = query.or(`code.ilike.%${term}%,customer_name.ilike.%${term}%,customer_whatsapp.ilike.%${term.replace(/\D/g, "") || term}%`);
  if (f.from) query = query.gte("created_at", new Date(`${f.from}T00:00:00`).toISOString());
  if (f.to) query = query.lt("created_at", new Date(new Date(`${f.to}T00:00:00`).getTime() + 86_400_000).toISOString());
  if (f.payment) query = query.eq("payment_status", f.payment);
  if (f.fulfillment) query = query.eq("fulfillment_status", f.fulfillment);
  const start = (f.page - 1) * f.pageSize;
  const { data, error, count } = await query.range(start, start + f.pageSize - 1);
  if (error) fail(error, "Não foi possível carregar os pedidos.");
  return { rows: (data ?? []) as OrderRow[], count: count ?? 0 };
}

export const orderDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const [o, items, events] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
        supabase.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: false }),
      ]);
      if (o.error) fail(o.error, "Não foi possível carregar o pedido.");
      if (items.error) fail(items.error, "Não foi possível carregar os itens.");
      if (events.error) fail(events.error, "Não foi possível carregar o histórico.");
      return { order: o.data as OrderRow | null, items: (items.data ?? []) as OrderItemRow[], events: (events.data ?? []) as OrderEventRow[] };
    },
  });

async function call(fn: string, args: Record<string, unknown>, fallback: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc(fn as any, args as any);
  if (error) fail(error, fallback);
  return data as { ok: boolean; already?: boolean; restocked?: boolean; total?: number; quantity?: number };
}

export const confirmPayment = (id: string, amount: number, note: string) =>
  call("admin_confirm_payment", { _order_id: id, _amount: amount, _note: note || null }, "Não foi possível confirmar o pagamento.");
export const setFulfillment = (id: string, to: Fulfillment, extra: { carrier?: string; tracking?: string; postedAt?: string } = {}) =>
  call(
    "admin_set_fulfillment",
    { _order_id: id, _to: to, _carrier: extra.carrier ?? null, _tracking: extra.tracking ?? null, _posted_at: extra.postedAt || null },
    "Não foi possível mudar a situação.",
  );
export const updateTracking = (id: string, carrier: string, tracking: string, postedAt: string) =>
  call("admin_update_tracking", { _order_id: id, _carrier: carrier, _tracking: tracking, _posted_at: postedAt || null }, "Não foi possível salvar o rastreio.");
export const cancelOrder = (id: string, reason: string, restock: boolean) =>
  call("admin_cancel_order", { _order_id: id, _reason: reason, _restock: restock }, "Não foi possível cancelar.");
export const registerRefund = (id: string, amount: number, note: string) =>
  call("admin_register_refund", { _order_id: id, _amount: amount, _note: note }, "Não foi possível registrar o reembolso.");
export const setShipping = (id: string, amount: number, service: string, days: string) =>
  call("admin_set_shipping", { _order_id: id, _amount: amount, _service: service, _days: days || null }, "Não foi possível salvar o frete.");
export const addOrderNote = (id: string, text: string) =>
  call("admin_add_order_note", { _order_id: id, _text: text }, "Não foi possível salvar a observação.");

/* ─────────────────────────── estoque ─────────────────────────── */

export const stockQuery = queryOptions({
  queryKey: ["admin-stock"],
  queryFn: async () => {
    const { data, error } = await supabase.from("product_stock").select("*");
    if (error) fail(error, "Não foi possível carregar o estoque.");
    return (data ?? []) as StockRow[];
  },
});

export const movementsQuery = (productId: string) =>
  queryOptions({
    queryKey: ["admin-movements", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) fail(error, "Não foi possível carregar o histórico de estoque.");
      return (data ?? []) as MovementRow[];
    },
  });

export const adjustStock = (productId: string, size: string, delta: number, reason: "reposicao" | "ajuste", note: string) =>
  call("admin_adjust_stock", { _product_id: productId, _size: size, _delta: delta, _reason: reason, _note: note || null }, "Não foi possível ajustar o estoque.");

/* ─────────────────────────── resumo + configuração ─────────────────────────── */

export type Dashboard = {
  awaiting: number;
  payment_pending: number;
  shipping_pending: number;
  paid_to_ship: number;
  revenue: number;
  paid_orders: number;
  daily: { day: string; total: number }[];
  low_stock: { product_id: string; name: string; size: string; quantity: number }[];
  untracked_products: number;
};

export const dashboardQuery = (fromIso: string, toIso: string, low: number) =>
  queryOptions({
    queryKey: ["admin-dashboard", fromIso, toIso, low],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard", { _from: fromIso, _to: toIso, _low_stock: low });
      if (error) fail(error, "Não foi possível carregar o resumo.");
      return data as unknown as Dashboard;
    },
  });

export type OperationSettings = { whatsapp?: string; pix_key?: string; pix_owner?: string; low_stock?: string };

export const operationSettingsQuery = queryOptions({
  queryKey: ["admin-settings-operacao"],
  queryFn: async () => {
    const { data, error } = await supabase.from("store_settings").select("value").eq("key", "operacao").maybeSingle();
    if (error) fail(error, "Não foi possível carregar a configuração.");
    return (data?.value ?? {}) as OperationSettings;
  },
});

export async function saveOperationSettings(v: OperationSettings) {
  const { error } = await supabase.from("store_settings").upsert({ key: "operacao", value: v });
  if (error) fail(error, "Não foi possível salvar a configuração.");
}

/** Link de conversa com o cliente (WhatsApp dele, não o da loja). */
export function customerWhatsappHref(phone: string, text: string) {
  const d = phone.replace(/\D/g, "");
  const full = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${full}?text=${encodeURIComponent(text.slice(0, 1500))}`;
}

/* ─────────────────────────── exportação e lote ─────────────────────────── */

/** Todos os pedidos que batem com os filtros (para planilha), em lotes de 500, no máximo 5.000. */
export async function listAllOrders(f: Omit<OrderFilters, "page" | "pageSize">, cap = 5000) {
  const rows: OrderRow[] = [];
  for (let page = 1; rows.length < cap; page++) {
    const r = await listOrders({ ...f, page, pageSize: 500 });
    rows.push(...r.rows);
    if (r.rows.length < 500 || rows.length >= r.count) break;
  }
  return rows.slice(0, cap);
}

/** Itens de vários pedidos (consulta em blocos de 100 para não estourar o limite da URL). */
export async function itemsOfOrders(ids: string[]) {
  const out: OrderItemRow[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from("order_items").select("*").in("order_id", ids.slice(i, i + 100)).order("created_at");
    if (error) fail(error, "Não foi possível carregar os itens dos pedidos.");
    out.push(...((data ?? []) as OrderItemRow[]));
  }
  return out;
}

export async function fetchOrdersByIds(ids: string[]) {
  const out: OrderRow[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from("orders").select("*").in("id", ids.slice(i, i + 100));
    if (error) fail(error, "Não foi possível carregar os pedidos.");
    out.push(...((data ?? []) as OrderRow[]));
  }
  return ids.map((id) => out.find((o) => o.id === id)).filter((o): o is OrderRow => Boolean(o));
}

/** Aplica a mesma ação em vários pedidos, um por vez; cada pedido segue as regras do banco e falhas não param os demais. */
export async function runBatch(ids: string[], action: (id: string) => Promise<unknown>) {
  let ok = 0;
  const failures: { id: string; message: string }[] = [];
  for (const id of ids) {
    try { await action(id); ok++; } catch (e) { failures.push({ id, message: e instanceof Error ? e.message : "Erro" }); }
  }
  return { ok, failures };
}
