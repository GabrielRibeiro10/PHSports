export type CategoryId = "masculino" | "feminino" | "retro" | "caneleiras" | "jogador";

export type Category = {
  id: CategoryId;
  slug: string;
  name: string;
  emoji: string;
  image: string;
  tagline: string;
};

export type Product = {
  slug: string;
  name: string;
  club: string;
  image: string;
  gallery: string[];
  price: number;
  oldPrice: number;
  discount: number;
  colors: string[];
  category: CategoryId;
  sizes?: string[];
  description?: string;
};

export const SIZES = ["P", "M", "G", "GG", "XG"] as const;
export type Size = string;

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const STORE_PHONE = "5512992319709"; // WhatsApp E.164 without '+'
export const STORE_PHONE_DISPLAY = "(12) 99231-9709";
export const STORE_EMAIL = "phsportsilha@gmail.com";
export const STORE_LOCATION = "Ilhabela – SP";
