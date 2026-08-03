import { formatBRL, STORE_PHONE, type Product } from "./products";
import type { CartItem } from "./cart";

const MAX_WA_TEXT = 1500;

/** Builds a wa.me link. Message text is stripped of control chars, capped and encoded. */
export function whatsappHref(text: unknown) {
  const safe = (typeof text === "string" ? text : "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .slice(0, MAX_WA_TEXT);
  const phone = String(STORE_PHONE).replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(safe)}`;
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
