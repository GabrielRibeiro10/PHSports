import type React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import hero from "@/assets/hero-banner.jpg";
import bgMobile from "@/assets/hero-bg-mobile.jpg";
import person from "@/assets/hero-person.webp";

const TITLE = [
  { text: "Vista as cores do", accent: false },
  { text: "seu clube.", accent: true },
];
const TITLE_LABEL = TITLE.map((t) => t.text).join(" ");

/** Título dividido em letras (spans) para a entrada com stagger. */
function SplitTitle() {
  const words = TITLE.flatMap((seg) => seg.text.split(" ").map((w) => ({ w, accent: seg.accent })));
  let accentIndex = 0; // posição da letra no destaque, para o brilho percorrer da esquerda à direita
  return (
    <>
      {words.map(({ w, accent }, wi) => (
        <span key={wi}>
          <span className="inline-block whitespace-nowrap" aria-hidden>
            {[...w].map((ch, ci) => (
              <span
                key={ci}
                className={`hero-char hero-reveal${accent ? " hero-char--accent" : ""}`}
                style={accent ? ({ "--i": accentIndex++ } as React.CSSProperties) : undefined}
              >
                {ch}
              </span>
            ))}
          </span>
          {wi < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);
  const personRef = useRef<HTMLImageElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    (async () => {
      const section = sectionRef.current;
      const canvas = canvasRef.current;
      if (!section || !canvas || !textRef.current || !slotRef.current) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const [{ playHeroIntro }, { startHeroParallax }, sceneModule] = await Promise.all([
        import("./hero-intro"),
        import("./hero-parallax"),
        import("./shirt-scene").catch(() => null),
      ]);
      if (cancelled) return;
      let scene = null;
      try {
        scene = sceneModule ? sceneModule.createShirtScene(canvas) : null;
      } catch {
        scene = null;
      }
      if (!scene) setWebglFailed(true);
      const stopIntro = playHeroIntro({
        section,
        startEl: textRef.current,
        endEl: slotRef.current,
        chars: Array.from(section.querySelectorAll<HTMLElement>(".hero-char")),
        extras: Array.from(section.querySelectorAll<HTMLElement>("[data-hero-extra]")),
        scene,
        reducedMotion,
      });
      const stopParallax = startHeroParallax(
        section,
        [
          { el: bgRef.current!, factor: 10, allowUp: true },
          { el: personRef.current!, factor: 26 },
        ],
        scene,
      );
      cleanup = () => {
        stopParallax();
        stopIntro();
      };
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="hero-pending relative isolate overflow-hidden bg-[#782b30]"
    >
      {/* Fundo 9:16 somente no mobile (arquivo original, sem recompressão) */}
      <img
        ref={bgRef}
        src={bgMobile}
        alt=""
        aria-hidden
        width={1116}
        height={2000}
        fetchPriority="high"
        className="absolute inset-0 -z-10 size-full scale-[1.04] object-cover object-left-top will-change-transform md:left-auto md:right-0 md:w-auto md:max-w-none md:object-contain md:object-right md:[mask-image:linear-gradient(to_right,transparent,black_35%)]"
      />
      {/* Modelo PH Sports no canto direito (mobile); a camisa 3D fica por cima */}
      <img
        ref={personRef}
        src={person}
        alt=""
        aria-hidden
        width={417}
        height={1026}
        className="pointer-events-none absolute bottom-0 -right-[16%] -z-[5] h-[86%] w-auto max-w-none object-contain object-right-bottom [filter:drop-shadow(-12px_0_24px_rgb(0_0_0/0.35))] md:right-[max(calc((100%-80rem)/2+10rem),calc(25%-9rem))] md:h-[94%] md:[mask-image:linear-gradient(to_right,transparent,black_12%,black_76%,transparent)]"
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 size-full opacity-0"
      />

      <div className="relative z-10 mx-auto h-[max(520px,calc(100svh-6.25rem))] max-w-7xl px-4 pt-[clamp(1.5rem,5svh,3rem)] md:grid md:h-[max(600px,calc(100svh-6.25rem))] md:grid-cols-2 md:items-center md:gap-8 md:py-16">
        <div ref={textRef}>
          <span
            data-hero-extra
            className="hero-reveal inline-flex items-center gap-2 border-l-2 border-white/80 pl-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/90"
          >
            Coleção 2026 • Edição Premium
          </span>
          <h1
            aria-label={TITLE_LABEL}
            className="mt-4 text-[clamp(2.1rem,min(11vw,6.2svh),3.4rem)] font-black leading-[1.02] tracking-[-0.03em] md:text-[clamp(3rem,5vw,4.5rem)]"
          >
            <SplitTitle />
          </h1>
          <p
            data-hero-extra
            className="hero-reveal mt-4 max-w-md md:mt-5 text-base leading-relaxed text-white/80"
          >
            Escudo bordado, tecido dry-fit. Por{" "}
            <span className="font-black tabular-nums text-white">R$ 179,90</span>.
          </p>
          <div data-hero-extra className="hero-reveal mt-6 flex flex-wrap gap-3 md:mt-8">
            <Link
              to="/"
              hash="produtos"
              className="btn-glow btn-shine inline-flex items-center gap-2 rounded-full bg-white px-5 py-3.5 md:px-7 text-sm font-bold text-foreground shadow-[var(--shadow-raised)]"
            >
              <span className="btn-silver">Comprar agora</span> <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/"
              hash="clubes"
              className="btn-glow inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3.5 md:px-7 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Ver clubes
            </Link>
          </div>
          <div
            data-hero-extra
            className="hero-reveal mt-5 flex flex-wrap items-center gap-5 md:mt-8 text-xs text-white/80"
          >
            <span className="inline-flex items-center gap-1.5">
              <Truck className="size-4 text-white" /> Envio para todo Brasil
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-white" /> Compra 100% segura
            </span>
          </div>
        </div>

        {/* Destino final da camisa 3D (lado direito). */}
        <div
          ref={slotRef}
          className="absolute bottom-3 right-4 aspect-square w-[clamp(150px,calc(100svh-6.25rem-23rem),58vw)] md:relative md:bottom-auto md:right-auto md:ml-auto md:w-full md:max-w-[min(420px,46vh)] md:self-end md:mb-[4vh]"
        >
          {webglFailed && (
            <img
              src={hero}
              alt="Coleção premium PH Sports — camisa, chuteira e bola de futebol"
              width={1600}
              height={1200}
              className="size-full rounded-2xl object-cover shadow-[var(--shadow-premium)] ring-1 ring-border"
            />
          )}
        </div>
      </div>
    </section>
  );
}
