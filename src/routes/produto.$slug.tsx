import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronRight, Ruler, RefreshCw, ShieldCheck, ShoppingBag, Zap } from "lucide-react";
import { formatBRL, getProduct, products, SIZES, type Size } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/produto/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Produto — PH Sports" }] };
    const p = loaderData.product;
    return {
      meta: [
        { title: `${p.name} — PH Sports` },
        { name: "description", content: `${p.name} com acabamento premium por ${formatBRL(p.price)}. Envio rápido e troca fácil na PH Sports.` },
        { property: "og:title", content: `${p.name} — PH Sports` },
        { property: "og:description", content: `Camisa ${p.club} por ${formatBRL(p.price)}.` },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { add } = useCart();
  const nav = useNavigate();
  const [size, setSize] = useState<Size | null>(null);
  const [qty, setQty] = useState(1);

  const ensureSize = () => {
    if (!size) {
      toast.error("Selecione um tamanho");
      return false;
    }
    return true;
  };
  const onAdd = () => {
    if (!ensureSize()) return;
    add(product.slug, size!, qty);
    toast.success("Adicionado ao carrinho");
  };
  const onBuy = () => {
    if (!ensureSize()) return;
    add(product.slug, size!, qty);
    nav({ to: "/carrinho" });
  };

  const sizeOptions = product.sizes ?? SIZES;
  const related = products.filter((p) => p.slug !== product.slug && p.category === product.category).slice(0, 4);
  const relatedFinal = related.length ? related : products.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-brand">Início</Link>
        <ChevronRight className="size-3" />
        <Link to="/" hash="produtos" className="hover:text-brand">Camisas</Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/40">
            <img
              src={product.image}
              alt={product.name}
              width={800}
              height={800}
              className="aspect-square w-full object-cover"
              fetchPriority="high"
            />
            <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1 text-xs font-black uppercase tracking-wider text-brand-foreground">
              Oferta
            </span>
            <span className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
              -{product.discount}%
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                className="overflow-hidden rounded-lg border border-border bg-secondary/40 transition hover:border-primary"
              >
                <img src={product.image} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{product.club}</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">{product.name}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black">{formatBRL(product.price)}</span>
            <span className="text-base text-muted-foreground line-through">{formatBRL(product.oldPrice)}</span>
            <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">-{product.discount}% Promoção</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ou 6x de <span className="font-semibold text-foreground">{formatBRL(product.price / 6)}</span> sem juros
          </p>

          {/* Size */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Tamanho</span>
              <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand">
                <Ruler className="size-3.5" /> Tabela de medidas
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizeOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`min-w-11 rounded-md border px-4 py-2.5 text-sm font-bold transition-colors ${
                    size === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Qty */}
          <div className="mt-5">
            <span className="text-sm font-bold">Quantidade</span>
            <div className="mt-2 inline-flex items-center overflow-hidden rounded-md border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-4 py-2 text-lg font-bold hover:bg-secondary"
                aria-label="Diminuir"
              >−</button>
              <span className="w-12 text-center text-sm font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-4 py-2 text-lg font-bold hover:bg-secondary"
                aria-label="Aumentar"
              >+</button>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-6 grid gap-2">
            <button
              onClick={onAdd}
              className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-primary bg-background px-6 py-3.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <ShoppingBag className="size-4" /> Adicionar ao Carrinho
            </button>
            <button
              onClick={onBuy}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-6 py-3.5 text-sm font-black text-brand-foreground shadow-md transition-transform hover:scale-[1.01]"
            >
              <Zap className="size-4" /> Comprar
            </button>
          </div>

          <ul className="mt-5 grid gap-2 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-2"><Check className="size-3.5 text-brand" /> Tecido premium com tecnologia dry-fit</li>
            <li className="inline-flex items-center gap-2"><Check className="size-3.5 text-brand" /> Escudo bordado e acabamento profissional</li>
            <li className="inline-flex items-center gap-2"><Check className="size-3.5 text-brand" /> Modelagem torcedor unissex</li>
          </ul>

          <div className="mt-6 grid gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-bold">Descrição</p>
            <p className="text-muted-foreground">
              Camisa oficial do {product.club} versão torcedor 2026. Confeccionada em poliéster premium de alta densidade,
              com tecnologia de secagem rápida, respirabilidade e conforto durante todo o dia.
            </p>
            <div className="grid gap-1 text-xs">
              <p><span className="font-bold">Material:</span> 100% poliéster dry-fit</p>
              <p><span className="font-bold">Modelagem:</span> Unissex</p>
              <p><span className="font-bold">Lavagem:</span> Máquina até 30°C, sem alvejante</p>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer font-bold">Tabela de medidas</summary>
              <table className="mt-2 w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-1">Tamanho</th><th>Peito (cm)</th><th>Comprimento (cm)</th></tr>
                </thead>
                <tbody>
                  {[["P",50,70],["M",53,72],["G",56,74],["GG",59,76],["XG",62,78]].map(([s,p,c]) => (
                    <tr key={s} className="border-t border-border/60"><td className="py-1 font-semibold">{s}</td><td>{p}</td><td>{c}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
            <div id="trocas" className="flex items-start gap-2 text-xs">
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-brand" />
              <span><strong>Troca e devolução:</strong> até 7 dias após o recebimento, sem burocracia.</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
              <span><strong>Compra segura:</strong> pagamento via Pix, rápido e protegido.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-black">Você também pode gostar</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
