import shirts from "@/assets/brand-shirts.webp";
import fansFlamengo from "@/assets/fans-flamengo.webp";
import fansVasco from "@/assets/fans-vasco.webp";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const LETTERS = [
  ...[..."PH"].map((c) => ({ c, accent: false })),
  ...[..."SPORTS"].map((c) => ({ c, accent: true })),
];

/**
 * Seção "PHSPORTS" com revelação editorial: letras sobem de uma máscara,
 * o contorno vira preenchimento numa varredura e um feixe de luz atravessa a palavra.
 * A palavra é ajustada para ocupar exatamente a largura disponível.
 */
export function BrandSignature() {
  const sectionRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Parallax dos torcedores: sobem até o lugar conforme a seção entra na tela
  // (nunca acima da base, para não mostrar o corte) e acompanham o mouse no desktop.
  const fansRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = fansRef.current;
    const section = sectionRef.current;
    if (!box || !section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layers = Array.from(box.querySelectorAll<HTMLElement>("[data-depth]"));
    let raf = 0;
    let mx = 0;
    const render = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      // 0 quando a seção está entrando por baixo, 1 quando ela está toda na tela
      const p = Math.min(1, Math.max(0, (vh - r.top) / Math.min(vh, r.height)));
      for (const el of layers) {
        const d = Number(el.dataset.depth);
        const y = (1 - p) * d * box.clientHeight * 0.35;
        // a dupla encosta na borda esquerda: só pode ir para a esquerda (não mostra o corte)
        const x = d < 1 ? Math.min(0, mx * d * 14) : mx * d * 14;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = section.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      queue();
    };
    queue();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    section.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      section.removeEventListener("pointermove", onMove);
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Ajusta o tamanho da fonte para a palavra preencher a largura (com a fonte real ou a reserva).
  useEffect(() => {
    const wrap = wrapRef.current;
    const line = lineRef.current;
    if (!wrap || !line) return;
    let lastW = -1;
    const fit = (force = false) => {
      const w = wrap.clientWidth;
      if (!force && w === lastW) return;
      lastW = w;
      wrap.style.fontSize = "100px";
      const natural = line.scrollWidth;
      if (natural > 0) wrap.style.fontSize = `${(w / natural) * 100}px`;
    };
    fit();
    document.fonts?.ready.then(() => fit(true)).catch(() => {});
    const onFonts = () => fit(true);
    document.fonts?.addEventListener?.("loadingdone", onFonts);
    const ro = new ResizeObserver(() => fit());
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", onFonts);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="PHSPORTS"
      data-wm-in={inView}
      className="relative -mb-20 flex flex-col overflow-hidden bg-[#ececec] md:block md:aspect-[1591/989] md:max-h-[100svh] md:w-full"
    >
      {/* Arte com as camisas (texto original removido; a palavra é animada por cima) */}
      <img
        src={shirts}
        alt="Camisas do Flamengo, Real Madrid e Corinthians"
        width={1591}
        height={989}
        loading="lazy"
        className="block h-[78vw] w-full object-cover object-[80%_50%] md:absolute md:inset-0 md:h-full md:object-right"
      />
      {/* Torcedores PH Sports recortados, embaixo da palavra (desktop e mobile) */}
      <div
        aria-hidden
        ref={fansRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] [container-type:size] md:h-[52%]"
      >
        <img
          data-depth="0.6"
          src={fansVasco}
          alt=""
          width={892}
          height={953}
          loading="lazy"
          className="wm-fans wm-reveal absolute bottom-0 left-0 h-full w-auto max-w-none"
          style={{ "--d": "0.9s" } as CSSProperties}
        />
        <img
          data-depth="1"
          src={fansFlamengo}
          alt=""
          width={607}
          height={960}
          loading="lazy"
          className="wm-fans wm-reveal absolute bottom-0 left-[79cqh] h-[97.6%] w-auto max-w-none"
          style={{ "--d": "1.05s" } as CSSProperties}
        />
      </div>
      <div className="relative order-first px-4 pb-2 pt-12 md:absolute md:top-[6%] md:bottom-[52%] md:order-none md:pb-0 md:left-[5%] md:right-auto md:flex md:w-[41%] md:flex-col md:justify-center md:px-0 md:pt-0">
        <p className="flex items-center justify-center gap-3 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.28em] text-brand sm:text-[11px] sm:tracking-[0.4em]">
          <span className="wm__rule wm__rule--l" aria-hidden />
          <span className="wm-reveal" style={{ "--d": "0.1s" } as CSSProperties}>
            Da arquibancada pra você
          </span>
          <span className="wm__rule wm__rule--r" aria-hidden />
        </p>
        <h2 aria-label="PHSPORTS" className="mx-auto mt-4 w-[78%] md:mt-[3.5%] md:w-full">
          <div ref={wrapRef} className="wm" data-in={inView}>
            <div ref={lineRef} className="wm__line" aria-hidden>
              {LETTERS.map(({ c, accent }, i) => (
                <span key={i} className="wm__char" style={{ "--i": i } as CSSProperties}>
                  <span className={`wm__glyph${accent ? " wm__glyph--accent" : ""}`}>
                    <span className="wm__outline">{c}</span>
                    <span className="wm__fill">{c}</span>
                  </span>
                </span>
              ))}
            </div>
            {/* Feixe de luz único atravessando a palavra inteira */}
            <div className="wm__line wm__line--shine" aria-hidden>
              {LETTERS.map(({ c }, i) => (
                <span key={i} className="wm__char">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </h2>
      </div>
    </section>
  );
}
