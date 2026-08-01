import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Category, CategoryId, Product } from "@/lib/products";

function mapProductRow(row: Tables<"products">): Product {
  return {
    slug: row.slug,
    name: row.name,
    club: row.club,
    image: row.image_url,
    gallery: [row.image_url_2, row.image_url_3, row.image_url_4].filter(
      (u): u is string => !!u && u.trim().length > 0,
    ),
    price: Number(row.price),
    oldPrice: Number(row.old_price),
    discount: row.discount,
    colors: row.colors ?? [],
    category: row.category,
    sizes: row.sizes ?? undefined,
    description: row.description ?? undefined,
  };
}

function mapCategoryRow(row: Tables<"categories">): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    emoji: row.emoji,
    image: row.image_url,
    tagline: row.tagline,
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
