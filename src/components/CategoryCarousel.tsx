import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoriesQueryOptions } from "@/lib/catalog";
import { useLoopCarousel } from "@/hooks/use-loop-carousel";

export function CategoryCarousel() {
  const { data: items = [] } = useQuery(categoriesQueryOptions);
  // loop infinito, setas, toque e autoplay: src/hooks/use-loop-carousel.ts
  const { slides, n, perView, trackRef, trackStyle, dots, active, nudge, goTo, holdAutoplay, touch, hover } =
    useLoopCarousel(items);

  return (
    <section id="categorias" className="relative">
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14 reveal-up">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              Escolha seu estilo
            </p>
            <h2 className="text-2xl font-black text-white md:text-3xl">
              Torcedor, jogador ou retrô?
            </h2>
          </div>
        </div>

        <div className="relative" {...hover}>
          <div data-reveal className="overflow-hidden" {...touch}>
            <div ref={trackRef} className="carousel-track flex" style={trackStyle}>
              {slides.map((c, i) => {
                const copy = i >= n;
                return (
                  <div
                    key={`${c.id}-${i}`}
                    className="shrink-0 px-2"
                    style={{ width: `${100 / perView}%` }}
                    aria-hidden={copy || undefined}
                  >
                    <Link
                      to="/categoria/$slug"
                      params={{ slug: c.slug }}
                      tabIndex={copy ? -1 : undefined}
                      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-premium)]"
                    >
                      <img
                        src={c.image}
                        alt={copy ? "" : c.name}
                        loading="lazy"
                        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                      <div className="relative z-10 p-5 text-white">
                        <h3 className="text-2xl font-black leading-none">{c.name}</h3>
                        <p className="mt-1 text-xs opacity-90">{c.tagline}</p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            aria-label="Anterior"
            onClick={() => nudge(-1)}
            className="absolute left-1 top-1/2 z-10 grid size-9 -translate-y-1/2 md:-left-3 md:size-11 place-items-center rounded-full border border-border bg-background shadow-md hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => nudge(1)}
            className="absolute right-1 top-1/2 z-10 grid size-9 -translate-y-1/2 md:-right-3 md:size-11 place-items-center rounded-full border border-border bg-background shadow-md hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="mt-4 flex justify-center gap-1.5">
            {Array.from({ length: dots }).map((_, i) => (
              <button
                key={i}
                aria-label={`Ir para ${i + 1}`}
                onClick={() => {
                  goTo(i);
                  holdAutoplay();
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-6 bg-brand" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
