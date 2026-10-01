import { Link } from "@tanstack/react-router";
import { Sparkles } from "@/components/Sparkles";
import { formatBRL, type Product } from "@/lib/products";

export function ProductCard({ p, priority = false, glow = false }: { p: Product; priority?: boolean; glow?: boolean }) {
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
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{p.club}</p>
        <h3 className="text-[0.9375rem] font-bold leading-snug text-foreground">{p.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="whitespace-nowrap text-lg font-black tabular-nums tracking-tight text-foreground sm:text-xl">{formatBRL(p.price)}</span>
          <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground line-through">{formatBRL(p.oldPrice)}</span>
        </div>
        <p className="text-[11px] font-semibold text-brand">Promoção — economize {formatBRL(p.oldPrice - p.price)}</p>

        <div className="mt-auto pt-3.5">
          <span
            aria-hidden
            className="btn-gen inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium"
          >
            <Sparkles className="size-4" /> <span className="btn-gen__text">Comprar</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
