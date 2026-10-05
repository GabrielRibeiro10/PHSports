import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { CategoryId } from "@/lib/products";
import { writeAudit } from "@/lib/audit";

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

// --- Upload hardening ---------------------------------------------------
// Only allow common web image formats, cap at 8 MB, verify MIME + magic bytes
// signature, and always rename the file to a safe slug-based path.
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 8 * 1024 * 1024;

async function readMagic(file: File, len = 12): Promise<Uint8Array> {
  const buf = await file.slice(0, len).arrayBuffer();
  return new Uint8Array(buf);
}

function magicMatches(bytes: Uint8Array, mime: string): boolean {
  const eq = (offset: number, sig: number[]) =>
    sig.every((b, i) => bytes[offset + i] === b);
  switch (mime) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return eq(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/gif":
      return eq(0, [0x47, 0x49, 0x46, 0x38]);
    case "image/webp":
      return eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50]);
    default:
      return false;
  }
}

async function validateImageFile(file: File): Promise<{ ext: string; mime: string }> {
  if (!file || file.size === 0) throw new Error("Arquivo vazio.");
  if (file.size > MAX_BYTES) throw new Error("Arquivo excede o tamanho máximo (8 MB).");
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    void writeAudit("upload.rejected", { metadata: { reason: "mime", mime, size: file.size } });
    throw new Error("Formato não permitido. Use JPG, PNG, WEBP ou GIF.");
  }
  const magic = await readMagic(file);
  if (!magicMatches(magic, mime)) {
    void writeAudit("upload.rejected", { metadata: { reason: "magic_mismatch", mime } });
    throw new Error("Arquivo inválido ou corrompido.");
  }
  return { ext: EXT_BY_MIME[mime], mime };
}

function safeSlug(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64) || "img";
}

/**
 * Downscale + re-encode to WebP before upload (best effort, browser only).
 * Falls back to the original file whenever the canvas pipeline is unavailable.
 */
async function compressImage(file: File): Promise<{ blob: Blob; ext: string; mime: string }> {
  const fallback = async () => {
    const { ext, mime } = await validateImageFile(file);
    return { blob: file as Blob, ext, mime };
  };
  if (typeof document === "undefined" || file.type === "image/gif") return fallback();
  try {
    const bitmap = await createImageBitmap(file);
    // 1200px já é nítido em telas retina para os cards e a página do produto, e pesa bem menos.
    const MAX = 1200;
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback();
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82),
    );
    if (!blob || blob.size === 0) return fallback();
    return { blob, ext: "webp", mime: "image/webp" };
  } catch {
    return fallback();
  }
}

async function uploadTo(prefix: string, file: File, hint: string): Promise<string> {
  await validateImageFile(file);
  const { blob, ext, mime } = await compressImage(file);
  const path = `${prefix}/${safeSlug(hint)}-${Date.now()}.${ext}`;
  // Nome do arquivo é único (data no nome): o navegador pode guardar a imagem por 1 ano.
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, blob, { upsert: true, cacheControl: "31536000", contentType: mime });
  if (error) throw error;
  void writeAudit(`${prefix}.upload_image`, {
    entity: "storage",
    metadata: { path, size: blob.size },
  });
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export async function uploadProductImage(file: File, slugHint: string): Promise<string> {
  return uploadTo("products", file, slugHint);
}

export async function uploadCategoryImage(file: File, id: string): Promise<string> {
  return uploadTo("categories", file, id);
}

export async function uploadBrandImage(file: File, id: string): Promise<string> {
  return uploadTo("brands", file, id);
}

export type ProductFormValues = {
  slug: string;
  name: string;
  club: string;
  image_url: string;
  image_url_2: string;
  image_url_3: string;
  image_url_4: string;
  price: number;
  old_price: number;
  category: CategoryId;
  brand_id: string | null;
  /** controlado por tamanho em Estoque (product_stock); não é editado aqui */
  stock?: number;
  featured: boolean;
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
    void writeAudit("product.update", {
      entity: "products",
      entityId: id,
      metadata: { slug: values.slug, price: values.price, old_price: values.old_price },
    });
  } else {
    const { error } = await supabase.from("products").insert(payload);
    if (error) throw error;
    void writeAudit("product.create", {
      entity: "products",
      metadata: { slug: values.slug, price: values.price },
    });
  }
}

export async function setProductActive(id: string, active: boolean) {
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) throw error;
  void writeAudit("product.toggle_active", { entity: "products", entityId: id, metadata: { active } });
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
  void writeAudit("product.delete", { entity: "products", entityId: id });
}

export type CategoryFormValues = {
  name: string;
  tagline: string;
  emoji: string;
  image_url: string;
  active?: boolean;
  sort_order?: number;
};

export async function updateCategory(id: CategoryId, values: CategoryFormValues) {
  const { error } = await supabase.from("categories").update(values).eq("id", id);
  if (error) throw error;
  void writeAudit("category.update", { entity: "categories", entityId: id, metadata: { name: values.name } });
}

export async function setCategoryActive(id: CategoryId, active: boolean) {
  const { error } = await supabase.from("categories").update({ active }).eq("id", id);
  if (error) throw error;
  void writeAudit("category.toggle_active", { entity: "categories", entityId: id, metadata: { active } });
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

