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

// Women
import femFlamengo from "@/assets/shirt-fem-flamengo.jpg";
import femCorinthians from "@/assets/shirt-fem-corinthians.jpg";
import femPalmeiras from "@/assets/shirt-fem-palmeiras.jpg";
import femSaopaulo from "@/assets/shirt-fem-saopaulo.jpg";
import femVasco from "@/assets/shirt-fem-vasco.jpg";
import femBrasil from "@/assets/shirt-fem-brasil.jpg";
import femBarcelona from "@/assets/shirt-fem-barcelona.jpg";
import femRealMadrid from "@/assets/shirt-fem-realmadrid.jpg";
import femPsg from "@/assets/shirt-fem-psg.jpg";
import femManCity from "@/assets/shirt-fem-mancity.jpg";

// Shin guards
import caneleiraNike from "@/assets/caneleira-nike.jpg";

// Retro
import retroBrasil2002 from "@/assets/retro-brasil-2002.jpg";
import retroBrasil1994 from "@/assets/retro-brasil-1994.jpg";
import retroFlamengo1981 from "@/assets/retro-flamengo-1981.jpg";
import retroPalmeiras1999 from "@/assets/retro-palmeiras-1999.jpg";
import retroVasco1998 from "@/assets/retro-vasco-1998.jpg";
import retroBarcelona2009 from "@/assets/retro-barcelona-2009.jpg";
import retroMilan2007 from "@/assets/retro-milan-2007.jpg";
import retroRealMadrid2002 from "@/assets/retro-realmadrid-2002.jpg";
import retroManUnited1999 from "@/assets/retro-manunited-1999.jpg";

// Player version
import jogadorFlamengo from "@/assets/jogador-flamengo.jpg";
import jogadorRealMadrid from "@/assets/jogador-realmadrid.jpg";
import jogadorBarcelona from "@/assets/jogador-barcelona.jpg";

export type CategoryId =
  | "masculino"
  | "feminino"
  | "retro"
  | "caneleiras"
  | "jogador";

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
  price: number;
  oldPrice: number;
  discount: number;
  colors: string[];
  category: CategoryId;
  sizes?: string[];
  description?: string;
};

export const PRICE = 99.9;
export const OLD_PRICE = 149.9;
export const DISCOUNT = 33;

const baseShirt = { price: PRICE, oldPrice: OLD_PRICE, discount: DISCOUNT, category: "masculino" as const };

export const products: Product[] = [
  { slug: "corinthians", name: "Camisa Corinthians", club: "Corinthians", image: corinthians, ...baseShirt, colors: ["#000000", "#FFFFFF"] },
  { slug: "palmeiras", name: "Camisa Palmeiras", club: "Palmeiras", image: palmeiras, ...baseShirt, colors: ["#006437", "#FFFFFF"] },
  { slug: "cruzeiro", name: "Camisa Cruzeiro", club: "Cruzeiro", image: cruzeiro, ...baseShirt, colors: ["#1e40af", "#FFFFFF"] },
  { slug: "vasco", name: "Camisa Vasco", club: "Vasco", image: vasco, ...baseShirt, colors: ["#000000", "#FFFFFF"] },
  { slug: "flamengo", name: "Camisa Flamengo", club: "Flamengo", image: flamengo, ...baseShirt, colors: ["#e50914", "#000000"] },
  { slug: "botafogo", name: "Camisa Botafogo", club: "Botafogo", image: botafogo, ...baseShirt, colors: ["#000000", "#FFFFFF"] },
  { slug: "saopaulo", name: "Camisa São Paulo", club: "São Paulo", image: saopaulo, ...baseShirt, colors: ["#FFFFFF", "#e50914", "#000000"] },
  { slug: "bahia", name: "Camisa Bahia", club: "Bahia", image: bahia, ...baseShirt, colors: ["#e50914", "#1e40af", "#FFFFFF"] },
  { slug: "gremio", name: "Camisa Grêmio", club: "Grêmio", image: gremio, ...baseShirt, colors: ["#000000", "#1e40af", "#FFFFFF"] },
  { slug: "internacional", name: "Camisa Internacional", club: "Internacional", image: internacional, ...baseShirt, colors: ["#e50914", "#FFFFFF"] },
  { slug: "atleticomg", name: "Camisa Atlético-MG", club: "Atlético-MG", image: atleticomg, ...baseShirt, colors: ["#000000", "#FFFFFF"] },
  { slug: "fluminense", name: "Camisa Fluminense", club: "Fluminense", image: fluminense, ...baseShirt, colors: ["#7f1d1d", "#065f46", "#FFFFFF"] },
  { slug: "santos", name: "Camisa Santos", club: "Santos", image: santos, ...baseShirt, colors: ["#FFFFFF", "#000000"] },
  { slug: "athleticopr", name: "Camisa Athletico-PR", club: "Athletico-PR", image: athleticopr, ...baseShirt, colors: ["#e50914", "#000000"] },

  // Women
  { slug: "fem-flamengo", name: "Camisa Feminina Flamengo", club: "Flamengo", image: femFlamengo, price: 109.9, oldPrice: 159.9, discount: 31, colors: ["#e50914", "#000000"], category: "feminino" },
  { slug: "fem-corinthians", name: "Camisa Feminina Corinthians", club: "Corinthians", image: femCorinthians, price: 109.9, oldPrice: 159.9, discount: 31, colors: ["#000000", "#FFFFFF"], category: "feminino" },
  { slug: "fem-palmeiras", name: "Camisa Feminina Palmeiras", club: "Palmeiras", image: femPalmeiras, price: 109.9, oldPrice: 159.9, discount: 31, colors: ["#006437", "#FFFFFF"], category: "feminino" },
  { slug: "fem-saopaulo", name: "Camisa Feminina São Paulo", club: "São Paulo", image: femSaopaulo, price: 109.9, oldPrice: 159.9, discount: 31, colors: ["#FFFFFF", "#e50914", "#000000"], category: "feminino" },
  { slug: "fem-vasco", name: "Camisa Feminina Vasco", club: "Vasco", image: femVasco, price: 109.9, oldPrice: 159.9, discount: 31, colors: ["#000000", "#FFFFFF"], category: "feminino" },
  { slug: "fem-brasil", name: "Camisa Feminina Seleção Brasileira", club: "Brasil", image: femBrasil, price: 119.9, oldPrice: 179.9, discount: 33, colors: ["#FFD400", "#006437"], category: "feminino" },
  { slug: "fem-barcelona", name: "Camisa Feminina Barcelona", club: "Barcelona", image: femBarcelona, price: 129.9, oldPrice: 189.9, discount: 32, colors: ["#a50044", "#004d98"], category: "feminino" },
  { slug: "fem-realmadrid", name: "Camisa Feminina Real Madrid", club: "Real Madrid", image: femRealMadrid, price: 129.9, oldPrice: 189.9, discount: 32, colors: ["#FFFFFF", "#DAA520"], category: "feminino" },
  { slug: "fem-psg", name: "Camisa Feminina PSG", club: "PSG", image: femPsg, price: 129.9, oldPrice: 189.9, discount: 32, colors: ["#0a1b3d", "#e50914"], category: "feminino" },
  { slug: "fem-mancity", name: "Camisa Feminina Manchester City", club: "Manchester City", image: femManCity, price: 129.9, oldPrice: 189.9, discount: 32, colors: ["#6CABDD", "#FFFFFF"], category: "feminino" },

  // Shin guards
  { slug: "caneleira-nike", name: "Caneleira Nike Mercurial Lite", club: "Nike", image: caneleiraNike, price: 79.9, oldPrice: 119.9, discount: 33, colors: ["#000000", "#FFFFFF"], category: "caneleiras", sizes: ["S", "M", "L"], description: "Caneleira Nike Mercurial Lite com carcaça em polipropileno de alta resistência, forro em EVA e tiras ajustáveis. Proteção leve e conforto para treinos e jogos." },

  // Retro
  { slug: "retro-brasil-2002", name: "Camisa Retrô Brasil 2002", club: "Brasil", image: retroBrasil2002, price: 149.9, oldPrice: 219.9, discount: 32, colors: ["#FFD400", "#006437"], category: "retro" },
  { slug: "retro-brasil-1994", name: "Camisa Retrô Brasil 1994", club: "Brasil", image: retroBrasil1994, price: 149.9, oldPrice: 219.9, discount: 32, colors: ["#FFD400", "#006437"], category: "retro" },
  { slug: "retro-flamengo-1981", name: "Camisa Retrô Flamengo 1981", club: "Flamengo", image: retroFlamengo1981, price: 149.9, oldPrice: 219.9, discount: 32, colors: ["#e50914", "#000000"], category: "retro" },
  { slug: "retro-palmeiras-1999", name: "Camisa Retrô Palmeiras 1999", club: "Palmeiras", image: retroPalmeiras1999, price: 149.9, oldPrice: 219.9, discount: 32, colors: ["#006437", "#FFFFFF"], category: "retro" },
  { slug: "retro-vasco-1998", name: "Camisa Retrô Vasco 1998", club: "Vasco", image: retroVasco1998, price: 149.9, oldPrice: 219.9, discount: 32, colors: ["#000000", "#FFFFFF"], category: "retro" },
  { slug: "retro-barcelona-2009", name: "Camisa Retrô Barcelona 2009", club: "Barcelona", image: retroBarcelona2009, price: 159.9, oldPrice: 229.9, discount: 30, colors: ["#a50044", "#004d98"], category: "retro" },
  { slug: "retro-milan-2007", name: "Camisa Retrô Milan 2007", club: "Milan", image: retroMilan2007, price: 159.9, oldPrice: 229.9, discount: 30, colors: ["#e50914", "#000000"], category: "retro" },
  { slug: "retro-realmadrid-2002", name: "Camisa Retrô Real Madrid 2002", club: "Real Madrid", image: retroRealMadrid2002, price: 159.9, oldPrice: 229.9, discount: 30, colors: ["#FFFFFF", "#DAA520"], category: "retro" },
  { slug: "retro-manunited-1999", name: "Camisa Retrô Manchester United 1999", club: "Manchester United", image: retroManUnited1999, price: 159.9, oldPrice: 229.9, discount: 30, colors: ["#e50914", "#FFFFFF"], category: "retro" },

  // Player version
  { slug: "jogador-flamengo", name: "Camisa Flamengo Versão Jogador", club: "Flamengo", image: jogadorFlamengo, price: 189.9, oldPrice: 279.9, discount: 32, colors: ["#e50914", "#000000"], category: "jogador", description: "Versão jogador com tecido tecnológico dry-fit, modelagem slim atlética, escudo em silicone, acabamento premium e altíssima respirabilidade. Idêntica à usada pelos atletas em campo." },
  { slug: "jogador-realmadrid", name: "Camisa Real Madrid Versão Jogador", club: "Real Madrid", image: jogadorRealMadrid, price: 199.9, oldPrice: 299.9, discount: 33, colors: ["#FFFFFF", "#DAA520"], category: "jogador", description: "Versão jogador com tecido tecnológico dry-fit, modelagem slim atlética, escudo em silicone, acabamento premium e altíssima respirabilidade." },
  { slug: "jogador-barcelona", name: "Camisa Barcelona Versão Jogador", club: "Barcelona", image: jogadorBarcelona, price: 199.9, oldPrice: 299.9, discount: 33, colors: ["#a50044", "#004d98"], category: "jogador", description: "Versão jogador com tecido tecnológico dry-fit, modelagem slim atlética, escudo em silicone, acabamento premium e altíssima respirabilidade." },
];

export const SIZES = ["P", "M", "G", "GG", "XG"] as const;
export type Size = string;

export const categories: Category[] = [
  { id: "masculino", slug: "homens", name: "Homens", emoji: "⚽", image: flamengo, tagline: "Camisas dos maiores clubes" },
  { id: "feminino", slug: "mulheres", name: "Mulheres", emoji: "👕", image: femFlamengo, tagline: "Modelagem feminina premium" },
  { id: "retro", slug: "retro", name: "Retrô", emoji: "🏆", image: retroBrasil2002, tagline: "Clássicos que marcaram época" },
  { id: "caneleiras", slug: "caneleiras", name: "Caneleiras", emoji: "🦵", image: caneleiraNike, tagline: "Proteção para treinos e jogos" },
  { id: "jogador", slug: "versao-jogador", name: "Versão Jogador", emoji: "⭐", image: jogadorFlamengo, tagline: "Tecnologia usada em campo" },
];

export function getCategoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function productsByCategory(id: CategoryId) {
  return products.filter((p) => p.category === id);
}

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
