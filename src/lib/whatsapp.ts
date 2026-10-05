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

export type CheckoutMessageLine = { name: string; size: string; qty: number; /** preço unitário */ price?: number };

/** Itens do carrinho com nome e preço do catálogo (itens sem produto ficam de fora). */
export function cartLines(items: Pick<CartItem, "slug" | "size" | "qty">[], products: Product[]): CheckoutMessageLine[] {
  return items.flatMap((it) => {
    const p = products.find((pr) => pr.slug === it.slug);
    return p ? [{ name: p.name, size: String(it.size), qty: it.qty, price: p.price }] : [];
  });
}

/**
 * Mensagem do "Finalizar pelo WhatsApp": tudo o que a loja precisa para fechar a venda
 * (pedido, itens, valores, cliente e endereço). `code` vazio = pedido não registrado no painel.
 */
export function buildCheckoutMessage(o: {
  code?: string | null;
  lines: CheckoutMessageLine[];
  subtotal: number;
  discount: number;
  coupon?: string | null;
  /** null = frete a combinar */
  shipping: { name: string; price: number; days: { min: number; max: number }; prepDays: number } | null;
  total: number;
  customer: { name: string; whatsapp: string };
  address: { street: string; number: string; complement?: string; district: string; city: string; uf: string; cep: string };
}) {
  const a = o.address;
  const s = o.shipping;
  const prazo = s ? (s.days.min === s.days.max ? `${s.days.max}` : `${s.days.min} a ${s.days.max}`) : "";
  const cupom = o.coupon
    ? o.discount > 0
      ? [`Cupom ${o.coupon}: -${formatBRL(o.discount)}`]
      : [`Cupom informado: ${o.coupon} (a confirmar)`]
    : o.discount > 0
      ? [`Desconto: -${formatBRL(o.discount)}`]
      : [];
  return [
    "Olá, PH Sports! Quero finalizar minha compra pelo site.",
    ...(o.code ? [`*Pedido ${o.code}*`] : []),
    "",
    "*Itens*",
    ...o.lines.flatMap((l, i) => [
      `${i + 1}. ${l.name}`,
      `   Tamanho ${l.size} · ${l.qty} un.${l.price != null ? ` · ${formatBRL(l.price * l.qty)}` : ""}`,
    ]),
    "",
    "*Valores*",
    `Produtos: ${formatBRL(o.subtotal)}`,
    ...cupom,
    s
      ? `Frete ${s.name}: ${formatBRL(s.price)} (${prazo} dias úteis após a postagem${s.prepDays > 0 ? ` + ${s.prepDays} de preparação` : ""})`
      : "Frete: a combinar",
    s ? `*Total: ${formatBRL(o.total)}*` : `*Total: ${formatBRL(o.total)} + frete*`,
    "",
    "*Cliente*",
    `Nome: ${o.customer.name}`,
    `WhatsApp: ${o.customer.whatsapp}`,
    "",
    "*Endereço de entrega*",
    `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ""}`,
    `${a.district} - ${a.city}/${a.uf}`,
    `CEP ${a.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}`,
    "",
    s
      ? "Pode me passar os dados para pagamento? Obrigado!"
      : "Pode me passar o valor do frete e os dados para pagamento? Obrigado!",
  ].join("\n");
}
