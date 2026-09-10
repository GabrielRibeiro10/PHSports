import { Link, useNavigate } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { formatBRL, type Product } from "@/lib/products";

export function ProductCard({ p, priority = false, glow = false }: { p: Product; priority?: boolean; glow?: boolean }) {
  const nav = useNavigate();

  const goToProduct = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    nav({ to: "/produto/$slug", params: { slug: p.slug } });
  };


  return (
    <Link
      to="/produto/$slug"
      params={{ slug: p.slug }}
      className="group relative z-[1] flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-flat)] transition-[box-shadow,transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[var(--shadow-raised)] motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/40">
        <img
          src={p.image}
          alt={p.name}
          width={800}
          height={800}
          loading={priority ? "eager" : "lazy"}
          className="size-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-brand-foreground">
          Oferta
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-black tabular-nums text-primary-foreground">
          -{p.discount}%
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{p.club}</p>
        <h3 className="text-[0.9375rem] font-bold leading-snug text-foreground">{p.name}</h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-xl font-black tabular-nums tracking-tight text-foreground">{formatBRL(p.price)}</span>
          <span className="text-xs tabular-nums text-muted-foreground line-through">{formatBRL(p.oldPrice)}</span>
        </div>
        <p className="text-[11px] font-semibold text-brand">Promoção — economize {formatBRL(p.oldPrice - p.price)}</p>

        <div className="mt-auto pt-3.5">
          <button
            type="button"
            onClick={goToProduct}
            className="btn-glow inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-brand-foreground"
          >
            <Zap className="size-3.5" /> Comprar
          </button>
        </div>
      </div>
    </Link>
  );
}
