import corinthians from "@/assets/shirt-corinthians.jpg";
import palmeiras from "@/assets/shirt-palmeiras.jpg";
import cruzeiro from "@/assets/shirt-cruzeiro.jpg";
import vasco from "@/assets/shirt-vasco.jpg";
import flamengo from "@/assets/shirt-flamengo.jpg";
import botafogo from "@/assets/shirt-botafogo.jpg";
import saopaulo from "@/assets/shirt-saopaulo.jpg";
import bahia from "@/assets/shirt-bahia.jpg";
import gremio from "@/assets/shirt-gremio.jpg";
import internacional from "@/assets/shirt-internacional.jpg";
import atleticomg from "@/assets/shirt-atleticomg.jpg";
import fluminense from "@/assets/shirt-fluminense.jpg";
import santos from "@/assets/shirt-santos.jpg";
import athleticopr from "@/assets/shirt-athleticopr.jpg";

export type Product = {
  slug: string;
  name: string;
  club: string;
  image: string;
  price: number;
  oldPrice: number;
  discount: number;
  colors: string[];
};

export const PRICE = 99.9;
export const OLD_PRICE = 149.9;
export const DISCOUNT = 33;

export const products: Product[] = [
  { slug: "corinthians", name: "Camisa Corinthians", club: "Corinthians", image: corinthians, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#000000", "#FFFFFF"] },
  { slug: "palmeiras", name: "Camisa Palmeiras", club: "Palmeiras", image: palmeiras, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#006437", "#FFFFFF"] },
  { slug: "cruzeiro", name: "Camisa Cruzeiro", club: "Cruzeiro", image: cruzeiro, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#1e40af", "#FFFFFF"] },
  { slug: "vasco", name: "Camisa Vasco", club: "Vasco", image: vasco, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#000000", "#FFFFFF"] },
  { slug: "flamengo", name: "Camisa Flamengo", club: "Flamengo", image: flamengo, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#e50914", "#000000"] },
  { slug: "botafogo", name: "Camisa Botafogo", club: "Botafogo", image: botafogo, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#000000", "#FFFFFF"] },
  { slug: "saopaulo", name: "Camisa São Paulo", club: "São Paulo", image: saopaulo, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#FFFFFF", "#e50914", "#000000"] },
  { slug: "bahia", name: "Camisa Bahia", club: "Bahia", image: bahia, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#e50914", "#1e40af", "#FFFFFF"] },
  { slug: "gremio", name: "Camisa Grêmio", club: "Grêmio", image: gremio, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#000000", "#1e40af", "#FFFFFF"] },
  { slug: "internacional", name: "Camisa Internacional", club: "Internacional", image: internacional, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#e50914", "#FFFFFF"] },
  { slug: "atleticomg", name: "Camisa Atlético-MG", club: "Atlético-MG", image: atleticomg, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#000000", "#FFFFFF"] },
  { slug: "fluminense", name: "Camisa Fluminense", club: "Fluminense", image: fluminense, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#7f1d1d", "#065f46", "#FFFFFF"] },
  { slug: "santos", name: "Camisa Santos", club: "Santos", image: santos, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#FFFFFF", "#000000"] },
  { slug: "athleticopr", name: "Camisa Athletico-PR", club: "Athletico-PR", image: athleticopr, price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, colors: ["#e50914", "#000000"] },
];

export const SIZES = ["P", "M", "G", "GG", "XG"] as const;
export type Size = (typeof SIZES)[number];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const STORE_PHONE = "5512992319709"; // WhatsApp E.164 without '+'
export const STORE_PHONE_DISPLAY = "(12) 99231-9709";
export const STORE_EMAIL = "phsportsilha@gmail.com";
export const STORE_LOCATION = "Ilhabela – SP";
