import { formatBRL, STORE_PHONE, type Product } from "./products";
import type { CartItem } from "./cart";

export function whatsappHref(text: string) {
  return `https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(text)}`;
}

export const TRACKING_MESSAGE =
  "Olá! Gostaria de acompanhar o status do meu pedido. Poderiam me ajudar com as informações de rastreamento?";

export const EXCHANGE_MESSAGE =
  "Olá! Gostaria de solicitar uma troca ou devolução. Poderiam me orientar sobre os próximos passos?";

export function buildOrderMessage(items: CartItem[], subtotal: number, products: Product[]) {
  const enriched = items
    .map((it) => ({ it, p: products.find((pr) => pr.slug === it.slug) }))
    .filter((x) => x.p);

  const produtos = enriched.map(({ it, p }) => `- ${p!.name} (x${it.qty})`).join("\n");
  const tamanhos = enriched.map(({ it, p }) => `- ${p!.name}: ${it.size}`).join("\n");
  const quantidades = enriched.map(({ it, p }) => `- ${p!.name}: ${it.qty}`).join("\n");

  return [
    "Olá, equipe PHSPORTS! Gostaria de finalizar meu pedido.",
    "",
    "Produtos:",
    produtos,
    "",
    "Tamanhos:",
    tamanhos,
    "",
    "Quantidade:",
    quantidades,
    "",
    `Valor Total:`,
    formatBRL(subtotal),
    "",
    "Aguardo as instruções para concluir a compra. Obrigado!",
  ].join("\n");
}
