import { Link } from "@tanstack/react-router";
import { formatBRL, type Product } from "@/lib/products";

export function ProductCard({ p, priority = false }: { p: Product; priority?: boolean }) {
  return (
    <Link
      to="/produto/$slug"
      params={{ slug: p.slug }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-[var(--shadow-premium)] hover:-translate-y-0.5"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/40">
        <img
          src={p.image}
          alt={p.name}
          width={800}
          height={800}
          loading={priority ? "eager" : "lazy"}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-brand-foreground shadow-sm">
          Oferta
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-black text-primary-foreground shadow-sm">
          -{p.discount}%
        </span>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{p.club}</p>
        <h3 className="text-sm font-bold text-foreground">{p.name}</h3>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-black text-foreground">{formatBRL(p.price)}</span>
          <span className="text-xs text-muted-foreground line-through">{formatBRL(p.oldPrice)}</span>
        </div>
        <p className="text-[11px] font-semibold text-brand">Promoção — economize {formatBRL(p.oldPrice - p.price)}</p>
      </div>
    </Link>
  );
}
