import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { formatBRL } from "@/lib/products";
import { itemProduct, useCart } from "@/lib/cart";
import { ShippingCalc } from "@/components/ShippingCalc";
import { buildOrderMessage, whatsappHref } from "@/lib/whatsapp";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — PH Sports" },
      { name: "description", content: "Revise seus itens e finalize sua compra via WhatsApp com a PH Sports." },
      { property: "og:title", content: "Carrinho — PH Sports" },
      { property: "og:description", content: "Finalize sua compra em poucos cliques." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal, hydrated, clear } = useCart();
  const [shipping, setShipping] = useState<{ label: string; value: number } | null>(null);
  const [cep, setCep] = useState("");

  const total = subtotal + (shipping?.value ?? 0);
  const msg = useMemo(() => buildOrderMessage(items, subtotal, shipping), [items, subtotal, shipping]);

  if (!hydrated) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">Carregando…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-secondary">
          <ShoppingBag className="size-8 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-black">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-muted-foreground">Que tal escolher a camisa do seu time?</p>
        <Link to="/" hash="produtos" className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground hover:scale-105 transition-transform">
          Ver camisas
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black md:text-3xl">Seu carrinho</h1>
        <button onClick={clear} className="text-xs font-semibold text-muted-foreground hover:text-destructive">
          Limpar tudo
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          {items.map((it) => {
            const p = itemProduct(it);
            if (!p) return null;
            return (
              <li key={`${it.slug}-${it.size}`} className="grid grid-cols-[80px_1fr_auto] items-center gap-4 rounded-xl border border-border bg-card p-3 md:grid-cols-[100px_1fr_auto_auto]">
                <img src={p.image} alt={p.name} width={100} height={100} loading="lazy" className="aspect-square size-20 rounded-lg object-cover md:size-24" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">{p.club}</p>
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Tamanho: <span className="font-semibold text-foreground">{it.size}</span></p>
                  <p className="mt-1 text-sm font-black">{formatBRL(p.price)}</p>
                </div>
                <div className="col-span-3 flex items-center gap-2 md:col-span-1">
                  <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
                    <button aria-label="Diminuir" onClick={() => setQty(it.slug, it.size, it.qty - 1)} className="px-3 py-1.5 hover:bg-secondary"><Minus className="size-3.5" /></button>
                    <span className="w-8 text-center text-sm font-bold">{it.qty}</span>
                    <button aria-label="Aumentar" onClick={() => setQty(it.slug, it.size, it.qty + 1)} className="px-3 py-1.5 hover:bg-secondary"><Plus className="size-3.5" /></button>
                  </div>
                  <button onClick={() => remove(it.slug, it.size)} aria-label="Remover" className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-xs text-muted-foreground">Subtotal</p>
                  <p className="font-black">{formatBRL(p.price * it.qty)}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-bold">Frete</p>
            <div className="mt-3">
              <ShippingCalc />
            </div>
            <div className="mt-3 grid gap-2">
              <input
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="Aplicar frete manualmente (ex: PAC R$ 24,90)"
                className="rounded-md border border-border bg-background px-3 py-2 text-xs outline-none"
                aria-label="Frete manual"
              />
              <div className="flex flex-wrap gap-2 text-xs">
                <button onClick={() => setShipping({ label: "PAC", value: 22.9 })} className="rounded-full border border-border px-3 py-1.5 hover:border-primary">PAC R$ 22,90</button>
                <button onClick={() => setShipping({ label: "SEDEX", value: 34.9 })} className="rounded-full border border-border px-3 py-1.5 hover:border-primary">SEDEX R$ 34,90</button>
                <button onClick={() => setShipping({ label: "Grátis", value: 0 })} className="rounded-full border border-border px-3 py-1.5 hover:border-primary">Grátis</button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Produtos</span><span className="font-semibold">{formatBRL(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span className="font-semibold">{shipping ? (shipping.value === 0 ? "GRÁTIS" : formatBRL(shipping.value)) : "a calcular"}</span></div>
              <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-sm font-bold">Total</span>
                <span className="text-2xl font-black">{formatBRL(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">ou 6x de {formatBRL(total / 6)} sem juros</p>
            </div>
            <a
              href={whatsappHref(msg)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-6 py-3.5 text-sm font-black text-brand-foreground shadow-md transition-transform hover:scale-[1.01]"
            >
              <MessageCircle className="size-4" /> Finalizar Compra
            </a>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Você será redirecionado ao nosso WhatsApp para confirmar o pedido.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
