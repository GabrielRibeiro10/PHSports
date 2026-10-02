import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Category, CategoryId, Product } from "@/lib/products";
import { sanitizeText, safeImageUrl } from "@/lib/input-safety";

/** Any string coming from the database is treated as untrusted content. */
function text(raw: unknown, max = 300): string {
  return sanitizeText(raw, max);
}

function img(raw: unknown): string {
  return safeImageUrl(raw) ?? "";
}

export function mapProductRow(row: Tables<"products">): Product {
  return {
    slug: text(row.slug, 120),
    name: text(row.name, 160),
    club: text(row.club, 120),
    image: img(row.image_url),
    gallery: [row.image_url_2, row.image_url_3, row.image_url_4]
      .map((u) => safeImageUrl(u))
      .filter((u): u is string => !!u && u.trim().length > 0),
    price: Number(row.price),
    oldPrice: Number(row.old_price),
    discount: row.discount,
    colors: (row.colors ?? []).map((c) => text(c, 40)).filter(Boolean),
    category: row.category,
    sizes: row.sizes ? row.sizes.map((s) => text(s, 20)).filter(Boolean) : undefined,
    description: row.description ? text(row.description, 2000) : undefined,
  };
}

export function mapCategoryRow(row: Tables<"categories">): Category {
  return {
    id: row.id,
    slug: text(row.slug, 120),
    // A categoria das caneleiras aparece no site como "Acessórios"
    name: /^caneleiras?$/i.test(text(row.name, 120).trim()) ? "Acessórios" : text(row.name, 120),
    emoji: text(row.emoji, 16),
    image: img(row.image_url),
    tagline: text(row.tagline, 200),
  };
}


export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapProductRow);
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCategoryRow);
}

export const productsQueryOptions = queryOptions({
  queryKey: ["products"],
  queryFn: fetchProducts,
});

export const categoriesQueryOptions = queryOptions({
  queryKey: ["categories"],
  queryFn: fetchCategories,
});

export function getProduct(products: Product[], slug: string) {
  return products.find((p) => p.slug === slug);
}

export function productsByCategory(products: Product[], id: CategoryId) {
  return products.filter((p) => p.category === id);
}

export function getCategoryBySlug(categories: Category[], slug: string) {
  return categories.find((c) => c.slug === slug);
}

/**
 * Subscribes to Postgres changes on products/categories so every open tab
 * (storefront included) refetches the moment an admin saves an edit.
 */
export function useCatalogRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("catalog-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
