import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { CategoryId } from "@/lib/products";

export type AdminProductRow = Tables<"products">;
export type AdminCategoryRow = Tables<"categories">;

async function fetchAllProductsAdmin(): Promise<AdminProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchAllCategoriesAdmin(): Promise<AdminCategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export const adminProductsQueryOptions = queryOptions({
  queryKey: ["admin-products"],
  queryFn: fetchAllProductsAdmin,
});

export const adminCategoriesQueryOptions = queryOptions({
  queryKey: ["admin-categories"],
  queryFn: fetchAllCategoriesAdmin,
});

function extFromFile(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

export async function uploadProductImage(file: File, slugHint: string): Promise<string> {
  const path = `products/${slugHint}-${Date.now()}.${extFromFile(file)}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export async function uploadCategoryImage(file: File, id: string): Promise<string> {
  const path = `categories/${id}-${Date.now()}.${extFromFile(file)}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export type ProductFormValues = {
  slug: string;
  name: string;
  club: string;
  image_url: string;
  price: number;
  old_price: number;
  category: CategoryId;
  colors: string[];
  sizes: string[] | null;
  description: string | null;
  active: boolean;
  sort_order: number;
};

function computeDiscount(price: number, oldPrice: number) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export async function upsertProduct(id: string | null, values: ProductFormValues) {
  const payload: TablesInsert<"products"> = {
    ...values,
    discount: computeDiscount(values.price, values.old_price),
  };
  if (id) {
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("products").insert(payload);
    if (error) throw error;
  }
}

export async function setProductActive(id: string, active: boolean) {
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export type CategoryFormValues = {
  name: string;
  tagline: string;
  emoji: string;
  image_url: string;
};

export async function updateCategory(id: CategoryId, values: CategoryFormValues) {
  const { error } = await supabase.from("categories").update(values).eq("id", id);
  if (error) throw error;
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
