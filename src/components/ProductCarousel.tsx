import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/products";

export function ProductCarousel({ items }: { items: Product[] }) {
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

  // Swipe
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
          {items.map((p) => (
            <div key={p.slug} className="shrink-0 px-2" style={{ width: `${100 / perView}%` }}>
              <ProductCard p={p} />
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

    </div>
  );
}
