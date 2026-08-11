import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle, Ticket, X, Check, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatBRL, SIZES } from "@/lib/products";
import { productsQueryOptions } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { buildOrderMessage, whatsappHref } from "@/lib/whatsapp";
import { redeemCoupon, validateCoupon } from "@/lib/coupons.functions";
import { useServerFn } from "@tanstack/react-start";


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
  const { items, setQty, remove, changeSize, subtotal, hydrated, clear, getProduct } = useCart();
  const { data: products = [] } = useQuery(productsQueryOptions);

  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [checking, setChecking] = useState(false);
  const validate = useServerFn(validateCoupon);
  const redeem = useServerFn(redeemCoupon);

  const discount = applied ? Math.min(applied.discount, subtotal) : 0;
  const total = Math.max(subtotal - discount, 0);
  const msg = useMemo(() => buildOrderMessage(items, total, products), [items, total, products]);

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    const code = couponInput.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase().slice(0, 40);
    if (!code || checking) return;
    setChecking(true);
    setCouponError("");
    try {
      const res = await validate({ data: { code, subtotal } });
      if (res.ok) {
        setApplied({ code: res.code, discount: res.discount });
        setCouponInput("");
        toast.success("Cupom aplicado", { description: `${res.code} • -${formatBRL(res.discount)}` });
      } else {
        setApplied(null);
        setCouponError(res.message);
      }
    } catch {
      setApplied(null);
      setCouponError("Cupom inválido ou expirado. Verifique o código e tente novamente.");
    } finally {
      setChecking(false);
    }
  }

  function removeCoupon() {
    setApplied(null);
    setCouponError("");
    toast.success("Cupom removido");
  }


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
        <Link to="/" hash="produtos" className="btn-glow mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground">
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
            const p = getProduct(it.slug);
            if (!p) return null;
            const available = p.sizes && p.sizes.length > 0 ? p.sizes : (SIZES as readonly string[]);
            const showSizeSelector = available.length > 0;
            return (
              <li key={`${it.slug}-${it.size}`} className="grid grid-cols-[80px_1fr_auto] items-center gap-4 rounded-xl border border-border bg-card p-3 md:grid-cols-[100px_1fr_auto_auto]">
                <img src={p.image} alt={p.name} width={100} height={100} loading="lazy" className="aspect-square size-20 rounded-lg object-cover md:size-24" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">{p.club}</p>
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Versão: <span className="text-foreground">{
                      p.category === "feminino" ? "Feminina" :
                      p.category === "retro" ? "Retrô" :
                      p.category === "jogador" ? "Jogador" :
                      p.category === "caneleiras" ? "Acessório" : "Torcedor"
                    }</span>
                  </p>
                  {showSizeSelector ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">Tamanho:</span>
                      {available.map((s) => {
                        const active = s === it.size;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              if (active) return;
                              changeSize(it.slug, it.size, s);
                              toast.success("Tamanho atualizado", { description: `${p.name} • ${s}` });
                            }}
                            className={`min-w-[34px] rounded-md border px-2 py-1 text-[11px] font-bold transition-all hover:-translate-y-0.5 ${
                              active
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-background text-foreground hover:border-primary"
                            }`}
                            aria-pressed={active}
                            aria-label={`Trocar tamanho para ${s}`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Tamanho: <span className="font-semibold text-foreground">{it.size}</span></p>
                  )}
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
            <div className="mb-4 border-b border-border pb-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Ticket className="size-3.5 text-brand" /> Cupom de desconto
              </p>
              {applied ? (
                <div className="flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 animate-in fade-in duration-200">
                  <Check className="size-4 shrink-0 text-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase">{applied.code}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">Cupom aplicado — {formatBRL(discount)} de desconto</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    aria-label="Remover cupom"
                    className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={applyCoupon} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError("");
                    }}
                    placeholder="Digite seu cupom"
                    maxLength={40}
                    autoComplete="off"
                    aria-label="Código do cupom"
                    aria-invalid={couponError ? true : undefined}
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm font-semibold uppercase tracking-wide outline-none transition-colors placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-brand"
                  />
                  <button
                    type="submit"
                    disabled={checking || !couponInput.trim()}
                    className="btn-glow inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-5 py-2.5 text-sm font-black text-brand-foreground shadow-sm disabled:opacity-50"
                  >
                    {checking ? <Loader2 className="size-4 animate-spin" /> : null} Aplicar
                  </button>
                </form>
              )}
              {couponError ? (
                <p role="alert" className="mt-2 text-xs font-semibold text-destructive animate-in fade-in duration-200">{couponError}</p>
              ) : null}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Produtos</span><span className="font-semibold">{formatBRL(subtotal)}</span></div>
              {discount > 0 ? (
                <div className="flex justify-between text-brand">
                  <span className="font-semibold">Desconto ({applied?.code})</span>
                  <span className="font-black">-{formatBRL(discount)}</span>
                </div>
              ) : null}
              <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-sm font-bold">Total</span>
                <span className="text-2xl font-black">{formatBRL(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">ou 6x de {formatBRL(total / 6)} sem juros</p>

            </div>
            <a
              href={whatsappHref(msg)}
              onClick={() => {
                // Usage is only recorded when the order is actually finalized.
                if (applied) void redeem({ data: { code: applied.code } }).catch(() => {});
              }}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-6 py-3.5 text-sm font-black text-brand-foreground shadow-md"
            >
              <MessageCircle className="size-4" /> Finalizar Compra no WhatsApp
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
