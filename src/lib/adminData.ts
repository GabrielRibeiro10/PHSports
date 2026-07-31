import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { writeAudit } from "@/lib/audit";

export type BrandRow = Tables<"brands">;
export type CustomerRow = Tables<"customers">;
export type OrderRow = Tables<"orders">;
export type OrderItemRow = Tables<"order_items">;
export type CouponRow = Tables<"coupons">;
export type ReviewRow = Tables<"reviews">;
export type ShippingRow = Tables<"shipping_zones">;
export type SettingRow = Tables<"store_settings">;
export type OrderStatus = OrderRow["status"];
export type ReviewStatus = ReviewRow["status"];

export const ORDER_STATUSES: OrderStatus[] = [
  "pendente",
  "pago",
  "enviado",
  "entregue",
  "cancelado",
];

async function list<T>(table: string, order: string, ascending = true): Promise<T[]> {
  const { data, error } = await supabase
    .from(table as never)
    .select("*")
    .order(order, { ascending });
  if (error) throw error;
  return (data ?? []) as T[];
}

export const brandsQueryOptions = queryOptions({
  queryKey: ["admin-brands"],
  queryFn: () => list<BrandRow>("brands", "sort_order"),
});

export const customersQueryOptions = queryOptions({
  queryKey: ["admin-customers"],
  queryFn: () => list<CustomerRow>("customers", "created_at", false),
});

export const ordersQueryOptions = queryOptions({
  queryKey: ["admin-orders"],
  queryFn: () => list<OrderRow>("orders", "created_at", false),
});

export const orderItemsQueryOptions = queryOptions({
  queryKey: ["admin-order-items"],
  queryFn: () => list<OrderItemRow>("order_items", "created_at", false),
});

export const couponsQueryOptions = queryOptions({
  queryKey: ["admin-coupons"],
  queryFn: () => list<CouponRow>("coupons", "created_at", false),
});

export const reviewsQueryOptions = queryOptions({
  queryKey: ["admin-reviews"],
  queryFn: () => list<ReviewRow>("reviews", "created_at", false),
});

export const shippingQueryOptions = queryOptions({
  queryKey: ["admin-shipping"],
  queryFn: () => list<ShippingRow>("shipping_zones", "sort_order"),
});

export const settingsQueryOptions = queryOptions({
  queryKey: ["admin-settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("store_settings").select("*");
    if (error) throw error;
    const map: Record<string, Record<string, string>> = {};
    for (const row of data ?? []) {
      map[row.key] = (row.value ?? {}) as Record<string, string>;
    }
    return map;
  },
});

export async function saveSetting(key: string, value: Record<string, string>) {
  const { error } = await supabase.from("store_settings").upsert({ key, value });
  if (error) throw error;
  void writeAudit("settings.update", { entity: "store_settings", entityId: key });
}

/* ---------------------------------------------------------------- brands */
export async function upsertBrand(id: string | null, values: TablesInsert<"brands">) {
  if (id) {
    const { error } = await supabase.from("brands").update(values).eq("id", id);
    if (error) throw error;
    void writeAudit("brand.update", { entity: "brands", entityId: id });
  } else {
    const { error } = await supabase.from("brands").insert(values);
    if (error) throw error;
    void writeAudit("brand.create", { entity: "brands" });
  }
}

export async function deleteBrand(id: string) {
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw error;
  void writeAudit("brand.delete", { entity: "brands", entityId: id });
}

/* --------------------------------------------------------------- coupons */
export async function upsertCoupon(id: string | null, values: TablesInsert<"coupons">) {
  if (id) {
    const { error } = await supabase.from("coupons").update(values).eq("id", id);
    if (error) throw error;
    void writeAudit("coupon.update", { entity: "coupons", entityId: id });
  } else {
    const { error } = await supabase.from("coupons").insert(values);
    if (error) throw error;
    void writeAudit("coupon.create", { entity: "coupons" });
  }
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw error;
  void writeAudit("coupon.delete", { entity: "coupons", entityId: id });
}

/* -------------------------------------------------------------- customers */
export async function upsertCustomer(id: string | null, values: TablesInsert<"customers">) {
  if (id) {
    const { error } = await supabase.from("customers").update(values).eq("id", id);
    if (error) throw error;
    void writeAudit("customer.update", { entity: "customers", entityId: id });
  } else {
    const { error } = await supabase.from("customers").insert(values);
    if (error) throw error;
    void writeAudit("customer.create", { entity: "customers" });
  }
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
  void writeAudit("customer.delete", { entity: "customers", entityId: id });
}

/* ----------------------------------------------------------------- orders */
export async function setOrderStatus(id: string, status: OrderStatus) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
  void writeAudit("order.update", { entity: "orders", entityId: id, metadata: { status } });
}

export async function deleteOrder(id: string) {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
  void writeAudit("order.delete", { entity: "orders", entityId: id });
}

/* ---------------------------------------------------------------- reviews */
export async function updateReview(id: string, values: TablesUpdate<"reviews">) {
  const { error } = await supabase.from("reviews").update(values).eq("id", id);
  if (error) throw error;
  void writeAudit("review.update", { entity: "reviews", entityId: id });
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
  void writeAudit("review.delete", { entity: "reviews", entityId: id });
}

/* --------------------------------------------------------------- shipping */
export async function upsertShipping(id: string | null, values: TablesInsert<"shipping_zones">) {
  if (id) {
    const { error } = await supabase.from("shipping_zones").update(values).eq("id", id);
    if (error) throw error;
    void writeAudit("shipping.update", { entity: "shipping_zones", entityId: id });
  } else {
    const { error } = await supabase.from("shipping_zones").insert(values);
    if (error) throw error;
    void writeAudit("shipping.create", { entity: "shipping_zones" });
  }
}

export async function deleteShipping(id: string) {
  const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
  if (error) throw error;
  void writeAudit("shipping.delete", { entity: "shipping_zones", entityId: id });
}

/* ------------------------------------------------------------- audit feed */
export const auditQueryOptions = queryOptions({
  queryKey: ["admin-audit"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    return data ?? [];
  },
});
