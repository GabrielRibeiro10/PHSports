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
      className="relative overflow-hidden border-t border-border bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-28">
        <p className="flex items-center justify-center gap-3 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.28em] text-brand sm:text-[11px] sm:tracking-[0.4em]">
          <span className="wm__rule wm__rule--l" aria-hidden />
          <span className="wm-reveal" style={{ "--d": "0.1s" } as CSSProperties}>
            Da arquibancada pra você
          </span>
          <span className="wm__rule wm__rule--r" aria-hidden />
        </p>
        <h2 aria-label="PHSPORTS" className="mx-auto mt-5 max-w-6xl md:mt-8">
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
        <p
          className="wm-reveal mx-auto mt-5 max-w-xl text-center text-sm text-muted-foreground md:mt-8 md:text-base"
          style={{ "--d": "1.1s" } as CSSProperties}
        >
          Pra quem assiste o jogo em pé, xinga o juiz e lava a camisa do avesso pra não estragar o
          escudo.
        </p>
      </div>
    </section>
  );
}
