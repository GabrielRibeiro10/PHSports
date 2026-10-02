import { createServerFn } from "@tanstack/react-start";
import { safeImageUrl, sanitizeText } from "@/lib/input-safety";

/**
 * Avaliações reais do Perfil da Empresa no Google (Google Maps), via Places API (New).
 * Configure nos segredos do projeto (nunca no código):
 *  - GOOGLE_PLACES_API_KEY: chave do Google Cloud com a "Places API (New)" ativada
 *  - GOOGLE_PLACE_ID: ID do lugar da loja (ex.: "ChIJ...")
 * Sem configuração (ou se o Google falhar) devolve null e a seção some do site.
 */
export type GoogleReview = {
  author: string;
  photo?: string;
  profileUrl?: string;
  rating: number;
  text: string;
  when: string;
};
export type GoogleReviews = {
  rating: number;
  total: number;
  url?: string;
  reviews: GoogleReview[];
};

type PlaceResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
};

const TTL = 6 * 60 * 60 * 1000; // 6h: as avaliações mudam pouco e a API é cobrada por chamada
let cache: { at: number; data: GoogleReviews | null } | null = null;

const httpsUrl = (u: unknown) => {
  const v = safeImageUrl(u);
  return v && /^https:\/\//i.test(v) ? v : undefined;
};

async function fetchReviews(): Promise<GoogleReviews | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId || !/^[\w-]{10,300}$/.test(placeId)) return null;
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
      },
    },
  );
  if (!res.ok) return null;
  const p = (await res.json()) as PlaceResponse;
  const reviews = (p.reviews ?? [])
    .map((r) => ({
      author: sanitizeText(r.authorAttribution?.displayName, 80) || "Cliente Google",
      photo: httpsUrl(r.authorAttribution?.photoUri),
      profileUrl: httpsUrl(r.authorAttribution?.uri),
      rating: Math.max(1, Math.min(5, Math.round(r.rating ?? 5))),
      text: sanitizeText(r.text?.text ?? r.originalText?.text, 600),
      when: sanitizeText(r.relativePublishTimeDescription, 40),
    }))
    .filter((r) => r.text);
  if (!p.rating || !reviews.length) return null;
  return {
    rating: Math.round(p.rating * 10) / 10,
    total: p.userRatingCount ?? reviews.length,
    url: httpsUrl(p.googleMapsUri),
    reviews,
  };
}

export const getGoogleReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<GoogleReviews | null> => {
    if (cache && Date.now() - cache.at < TTL) return cache.data;
    try {
      const data = await fetchReviews();
      cache = { at: Date.now(), data };
      return data;
    } catch {
      return cache?.data ?? null;
    }
  },
);
