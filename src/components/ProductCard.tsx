import { Link } from "@tanstack/react-router";
import { useRef, type TouchEvent } from "react";
import { formatBRL, type Product } from "@/lib/products";

export function ProductCard({
  p,
  priority = false,
  glow = false,
  tabIndex,
}: {
  p: Product;
  priority?: boolean;
  glow?: boolean;
  /** -1 nas cópias do carrossel em loop (o Tab não passa duas vezes pela mesma camisa) */
  tabIndex?: number;
}) {
  const back = p.gallery.find((u) => u && u !== p.image);
  // Toque: mostra a foto de trás enquanto o dedo está no card e um pouco depois de soltar.
  const offTimer = useRef<number | undefined>(undefined);
  const touchOn = (e: TouchEvent<HTMLAnchorElement>) => {
    if (!back) return;
    window.clearTimeout(offTimer.current);
    e.currentTarget.classList.add("pc-touch");
  };
  const touchOff = (e: TouchEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    window.clearTimeout(offTimer.current);
    offTimer.current = window.setTimeout(() => el.classList.remove("pc-touch"), 900);
  };
  return (
    <Link
      onTouchStart={touchOn}
      onTouchEnd={touchOff}
      onTouchCancel={touchOff}
      data-reveal
      tabIndex={tabIndex}
      to="/produto/$slug"
      params={{ slug: p.slug }}
      className="group relative z-[1] flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-flat)] transition-[box-shadow,transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[var(--shadow-raised)] motion-reduce:hover:translate-y-0"
    >
      {/* Foto da camisa: 2ª foto (costas) aparece no hover, zoom leve e botão subindo */}
      <div
        className={`pc-media relative aspect-[4/5] overflow-hidden ${back ? "pc-media--swap" : ""}`}
      >
        <img
          src={p.image}
          alt={p.name}
          width={800}
          height={1000}
          loading={priority ? "eager" : "lazy"}
          className="pc-img pc-img--main absolute inset-0 size-full object-cover"
        />
        {back && (
          <img
            src={back}
            alt=""
            aria-hidden
            width={800}
            height={1000}
            loading="lazy"
            className="pc-img pc-img--alt absolute inset-0 size-full object-cover"
          />
        )}
        <span className="absolute left-3 top-3 z-[2] rounded-full bg-primary px-2.5 py-1 text-[10px] font-black tabular-nums text-primary-foreground">
          -{p.discount}%
        </span>
        <span aria-hidden className="pc-quick">
          Adicionar ao carrinho
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {p.club}
        </p>
        <h3 className="text-[0.9375rem] font-bold leading-snug text-foreground">
          {p.name.replace(/^Camisa\s+/i, "")}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="whitespace-nowrap text-lg font-black tabular-nums tracking-tight text-foreground sm:text-xl">
            {formatBRL(p.price)}
          </span>
          <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground line-through">
            {formatBRL(p.oldPrice)}
          </span>
        </div>

        <div className="mt-auto pt-3.5">
          <span
            aria-hidden
            className="inline-flex w-full items-center justify-center rounded-full border border-foreground/15 px-4 py-2.5 text-[13px] font-semibold text-foreground transition-colors duration-200 group-hover:border-brand group-hover:bg-brand group-hover:text-brand-foreground"
          >
            Comprar
          </span>
        </div>
      </div>
    </Link>
  );
}
