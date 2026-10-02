import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoriesQueryOptions } from "@/lib/catalog";

/** Mesmo tempo da transição do .carousel-track (700ms) + folga. */
const SLIDE_MS = 720;

export function CategoryCarousel() {
  const { data: items = [] } = useQuery(categoriesQueryOptions);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(4);
  const [paused, setPaused] = useState(false);
  const [animate, setAnimate] = useState(true);
  const resumeTimer = useRef<number | null>(null);
  const pending = useRef<number | null>(null);
  const indexRef = useRef(0);
  indexRef.current = index;

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < 640) setPerView(1);
      else if (w < 900) setPerView(2);
      else if (w < 1200) setPerView(3);
      else setPerView(4);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const n = items.length;
  const maxIndex = Math.max(0, n - perView);
  // Loop infinito: os primeiros cards se repetem no fim. Ao chegar neles, o carrossel volta
  // sem animação para os originais (mesma imagem), então sempre anda para a esquerda.
  const loop = n > perView;
  const slides = loop ? [...items, ...items.slice(0, perView)] : items;
  const last = loop ? n : maxIndex;

  // Salta sem animação para `to` e, em seguida, anda com animação até `then` (se houver).
  const jump = (to: number, then: number | null) => {
    pending.current = then;
    setAnimate(false);
    setIndex(to);
  };

  const step = (dir: 1 | -1) => {
    const i = indexRef.current;
    if (!loop) {
      const next = i + dir;
      setIndex(next < 0 ? maxIndex : next > maxIndex ? 0 : next);
    } else if (dir === 1) {
      if (i >= n) jump(i - n, i - n + 1);
      else setIndex(i + 1);
    } else if (i === 0) jump(n, n - 1);
    else setIndex(i - 1);
  };

  const goTo = (target: number) => {
    const i = indexRef.current;
    if (loop && i >= n) jump(i - n, target);
    else setIndex(target);
  };

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => step(1), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, loop, n, maxIndex]);

  useEffect(() => {
    if (index > last) setIndex(0);
  }, [last, index]);

  // Chegou nas cópias do início: troca para os cards originais sem o usuário perceber.
  useEffect(() => {
    if (!loop || index < n) return;
    const t = window.setTimeout(() => jump(index - n, null), SLIDE_MS);
    return () => clearTimeout(t);
  }, [loop, index, n]);

  // Depois de um salto sem animação, religa a transição e faz o passo pendente.
  useEffect(() => {
    if (animate) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setAnimate(true);
        if (pending.current != null) setIndex(pending.current);
        pending.current = null;
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [animate]);

  const holdAutoplay = () => {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 5000);
  };

  const nudge = (dir: 1 | -1) => {
    holdAutoplay();
    step(dir);
  };

  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (startX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < 40) return;
    nudge(dx < 0 ? 1 : -1);
  };

  const dots = loop ? n : maxIndex + 1;
  const active = loop ? index % n : index;

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
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div data-reveal className="overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div
              className="carousel-track flex"
              style={{
                transform: `translate3d(-${(index * 100) / perView}%, 0, 0)`,
                transition: animate ? undefined : "none",
              }}
            >
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
            className="hidden md:grid absolute -left-3 top-1/2 -translate-y-1/2 size-11 place-items-center rounded-full border border-border bg-background shadow-md hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => nudge(1)}
            className="hidden md:grid absolute -right-3 top-1/2 -translate-y-1/2 size-11 place-items-center rounded-full border border-border bg-background shadow-md hover:bg-primary hover:text-primary-foreground transition-colors"
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
