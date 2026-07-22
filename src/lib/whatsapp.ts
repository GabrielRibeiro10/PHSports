import { formatBRL, products, STORE_PHONE } from "./products";
import type { CartItem } from "./cart";

export function whatsappHref(text: string) {
  return `https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(text)}`;
}

export function buildOrderMessage(
  items: CartItem[],
  subtotal: number,
  shipping: { label: string; value: number } | null,
) {
  const lines: string[] = [];
  lines.push("*Novo pedido — PH Sports* 🛒");
  lines.push("");
  items.forEach((it, idx) => {
    const p = products.find((pr) => pr.slug === it.slug);
    if (!p) return;
    lines.push(`${idx + 1}. ${p.name}`);
    lines.push(`   • Tamanho: ${it.size}`);
    lines.push(`   • Quantidade: ${it.qty}`);
    lines.push(`   • Subtotal: ${formatBRL(p.price * it.qty)}`);
  });
  lines.push("");
  lines.push(`*Produtos:* ${formatBRL(subtotal)}`);
  if (shipping) {
    lines.push(`*Frete (${shipping.label}):* ${shipping.value === 0 ? "GRÁTIS" : formatBRL(shipping.value)}`);
    lines.push(`*Total:* ${formatBRL(subtotal + shipping.value)}`);
  } else {
    lines.push(`*Frete:* a combinar`);
    lines.push(`*Total:* ${formatBRL(subtotal)}`);
  }
  lines.push("");
  lines.push("Olá! Quero finalizar essa compra.");
  return lines.join("\n");
}
