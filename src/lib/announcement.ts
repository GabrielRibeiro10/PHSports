// Aviso/promoção no topo da loja, editável em Configurações (store_settings, chave "aviso", leitura pública).
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Announcement = { active: boolean; text: string; href: string | null; label: string };

export const MAX_TEXT = 140;

/** Só aceita caminhos do próprio site ("/categoria/retro") ou links https. Nada de javascript:, data: etc. */
export function safeHref(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > 300) return null;
  if (s.startsWith("/") && !s.startsWith("//") && !/[\s\\]/.test(s)) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseAnnouncement(value: unknown): Announcement {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const text = typeof v.text === "string" ? v.text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT) : "";
  const label = typeof v.label === "string" ? v.label.trim().slice(0, 30) : "";
  return { active: v.active === "1" && text !== "", text, href: safeHref(v.href), label };
}

export const announcementQuery = queryOptions({
  queryKey: ["announcement"],
  queryFn: async () => {
    const { data } = await supabase.from("store_settings").select("value").eq("key", "aviso").maybeSingle();
    return parseAnnouncement(data?.value);
  },
  staleTime: 60_000,
});
