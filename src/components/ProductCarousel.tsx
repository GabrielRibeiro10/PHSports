import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/products";
import { useLoopCarousel } from "@/hooks/use-loop-carousel";

export function ProductCarousel({ items }: { items: Product[] }) {
  const { slides, n, index, perView, trackRef, trackStyle, nudge, touch, hover } = useLoopCarousel(items);

  return (
    <div className="relative" {...hover}>
      {/* O carrossel aparece inteiro ao rolar (data-reveal aqui). Os cards ficam fora do efeito
          (data-no-reveal): cada card escondido na lateral nascia invisível e só surgia, subindo,
          depois de entrar pela seta — era o "bug" ao trocar de camisa. */}
      <div data-reveal className="overflow-hidden" {...touch}>
        <div ref={trackRef} data-no-reveal className="carousel-track flex" style={trackStyle}>
          {slides.map((p, i) => {
            const copy = i >= n;
            return (
              <div
                key={`${p.slug}-${i}`}
                className="shrink-0 px-2 py-4"
                style={{ width: `${100 / perView}%` }}
                aria-hidden={copy || undefined}
              >
                <div className="premium-glow h-full">
                  {/* fotos da tela atual e das próximas já carregadas: não chegam em branco */}
                  <ProductCard
                    p={p}
                    glow
                    priority={i >= index - perView && i < index + perView * 2}
                    tabIndex={copy ? -1 : undefined}
                  />
                </div>
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
    </div>
  );
}
