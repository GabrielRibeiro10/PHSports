import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { categoriesQueryOptions } from "@/lib/catalog";

/** Segundos para cada card atravessar a largura dele (ritmo parecido com o carrossel de clubes). */
const SECONDS_PER_CARD = 6.5;
/** Máximo de cards visíveis ao mesmo tempo (desktop largo). */
const MAX_PER_VIEW = 4;

export function CategoryCarousel() {
  const { data: items = [] } = useQuery(categoriesQueryOptions);
  // Esteira contínua para a esquerda, igual ao carrossel de clubes: a sequência se repete até
  // cobrir a tela e vem duplicada, então ao andar -50% ela emenda sem "pulo".
  const reps = items.length ? Math.ceil(MAX_PER_VIEW / items.length) : 0;
  const base = Array.from({ length: reps }, () => items).flat();
  const loop = [...base, ...base];

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

        <div
          data-reveal
          className="cat-marquee overflow-hidden [container-type:inline-size] [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]"
        >
          <div
            className="cat-track flex w-max"
            style={{ "--cat-dur": `${base.length * SECONDS_PER_CARD}s` } as CSSProperties}
          >
            {loop.map((c, i) => {
              const copy = i >= items.length;
              return (
                <div
                  key={`${c.id}-${i}`}
                  className="w-[100cqw] shrink-0 px-2 min-[640px]:w-[50cqw] min-[900px]:w-[33.3333cqw] min-[1200px]:w-[25cqw]"
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
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                        Categoria
                      </span>
                      <h3 className="mt-3 text-2xl font-black leading-none">{c.name}</h3>
                      <p className="mt-1 text-xs opacity-90">{c.tagline}</p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
