import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoriesQueryOptions } from "@/lib/catalog";

export function CategoryCarousel() {
  const { data: items = [] } = useQuery(categoriesQueryOptions);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(4);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<number | null>(null);

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

  const maxIndex = Math.max(0, items.length - perView);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, 3000);
    return () => clearInterval(id);
  }, [paused, maxIndex]);

  useEffect(() => {
    if (index > maxIndex) setIndex(0);
  }, [maxIndex, index]);

  const nudge = (dir: 1 | -1) => {
    setPaused(true);
    setIndex((i) => {
      const next = i + dir;
      if (next < 0) return maxIndex;
      if (next > maxIndex) return 0;
      return next;
    });
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 5000);
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

  return (
    <section id="categorias" className="mx-auto max-w-7xl px-4 py-10 md:py-14 reveal-up">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Do estádio à pelada</p>
          <h2 className="text-2xl font-black md:text-3xl">Torcedor, jogador ou retrô?</h2>
        </div>
      </div>

      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div
            className="carousel-track flex"
            style={{ transform: `translate3d(-${(index * 100) / perView}%, 0, 0)` }}
          >
            {items.map((c) => (
              <div key={c.id} className="shrink-0 px-2" style={{ width: `${100 / perView}%` }}>
                <Link
                  to="/categoria/$slug"
                  params={{ slug: c.slug }}
                  className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-premium)]"
                >
                  <img
                    src={c.image}
                    alt={c.name}
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
            ))}
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
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              aria-label={`Ir para ${i + 1}`}
              onClick={() => {
                setIndex(i);
                setPaused(true);
                if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
                resumeTimer.current = window.setTimeout(() => setPaused(false), 5000);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-brand" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
