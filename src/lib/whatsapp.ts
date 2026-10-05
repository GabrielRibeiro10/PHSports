import { formatBRL, STORE_PHONE, type Product } from "./products";
import type { CartItem } from "./cart";

const MAX_WA_TEXT = 1500;

/** Builds a wa.me link. Message text is stripped of control chars, capped and encoded. */
export function whatsappHref(text: unknown, phoneOverride?: string) {
  const safe = (typeof text === "string" ? text : "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .slice(0, MAX_WA_TEXT);
  const phone = String(phoneOverride || STORE_PHONE).replace(/\D/g, "");
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

/** Mensagem do pedido já registrado (código, itens, frete escolhido, endereço e total cobrado). */
export function buildConfirmedOrderMessage(o: {
  code: string;
  lines: { name: string; size: string; qty: number }[];
  subtotal: number;
  discount: number;
  /** null = frete a combinar */
  shipping: { name: string; price: number; days: { min: number; max: number }; prepDays: number } | null;
  total: number;
  address: { street: string; number: string; complement?: string; district: string; city: string; uf: string; cep: string };
  customer: { name: string };
}) {
  const a = o.address;
  const s = o.shipping;
  const prazo = s ? (s.days.min === s.days.max ? `${s.days.max}` : `${s.days.min} a ${s.days.max}`) : "";
  return [
    `Olá, equipe PHSPORTS! Acabei de fazer o pedido *${o.code}*.`,
    "",
    "Produtos:",
    ...o.lines.map((l) => `- ${l.name} | Tam. ${l.size} | x${l.qty}`),
    "",
    `Produtos: ${formatBRL(o.subtotal)}`,
    ...(o.discount > 0 ? [`Desconto: -${formatBRL(o.discount)}`] : []),
    s
      ? `Frete ${s.name}: ${formatBRL(s.price)} (${prazo} dias úteis após a postagem${s.prepDays > 0 ? ` + ${s.prepDays} de preparação` : ""})`
      : "Frete: a combinar (por favor, me passem o valor)",
    s ? `*Total: ${formatBRL(o.total)}*` : `*Total: ${formatBRL(o.total)} + frete*`,
    "",
    "Entrega:",
    o.customer.name,
    `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ""}`,
    `${a.district} - ${a.city}/${a.uf}`,
    `CEP ${a.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}`,
    "",
    "Aguardo as instruções de pagamento. Obrigado!",
  ].join("\n");
}
