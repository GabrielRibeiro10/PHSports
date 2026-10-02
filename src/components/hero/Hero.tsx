import type React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import hero from "@/assets/hero-banner.jpg";
import posterDesktop from "@/assets/hero-video-d.webp";
import posterMobile from "@/assets/hero-video-m.webp";
import videoDesktopAv1 from "@/assets/hero-video-d-av1.mp4";
import videoDesktopH264 from "@/assets/hero-video-d.mp4";
import videoMobileAv1 from "@/assets/hero-video-m-av1.mp4";
import videoMobileH264 from "@/assets/hero-video-m.mp4";
import person from "@/assets/hero-person.webp";
import personMobile from "@/assets/hero-person-mobile.webp";
import { Ticker } from "@/components/Ticker";

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
  const bgRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const personRef = useRef<HTMLImageElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  // Vídeo de fundo: cada aparelho baixa só a sua versão (celular recortado / desktop; AV1 quando suportado,
  // senão H.264). Não carrega com "economia de dados" ou "reduzir movimento" (fica o 1º quadro).
  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const av1 = video.canPlayType('video/mp4; codecs="av01.0.08M.08"') !== "";
    let visible = true;
    const pick = () => {
      const src = mq.matches
        ? av1
          ? videoDesktopAv1
          : videoDesktopH264
        : av1
          ? videoMobileAv1
          : videoMobileH264;
      if (video.getAttribute("src") === src) return;
      setVideoReady(false);
      video.src = src;
      if (visible) void video.play().catch(() => {});
    };
    pick();
    mq.addEventListener("change", pick);
    // pausa quando a HERO sai da tela (economiza bateria) e volta ao reaparecer
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) void video.play().catch(() => {});
      else video.pause();
    });
    io.observe(section);
    return () => {
      mq.removeEventListener("change", pick);
      io.disconnect();
      video.pause();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    (async () => {
      const section = sectionRef.current;
      const canvas = canvasRef.current;
      if (!section || !canvas || !textRef.current || !slotRef.current) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const [{ playHeroIntro }, { startHeroParallax }] = await Promise.all([
        import("./hero-intro"),
        import("./hero-parallax"),
      ]);
      if (cancelled) return;
      // Camisa 3D removida da HERO (desktop e mobile): sem cena, a entrada anima só o texto.
      const scene = null;
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
      data-hero
      className="hero-pending relative isolate overflow-hidden bg-[#0b1220] supports-[overflow:clip]:overflow-clip"
    >
      {/* Fundo: vídeo do estádio (vai e volta, sem "recomeço"). O 1º quadro aparece na hora, antes do vídeo. */}
      <div
        ref={bgRef}
        aria-hidden
        className="absolute inset-0 -z-10 scale-[1.04] will-change-transform"
      >
        <picture>
          <source media="(min-width: 768px)" srcSet={posterDesktop} />
          <img
            src={posterMobile}
            alt=""
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover"
          />
        </picture>
        <video
          ref={videoRef}
          muted
          playsInline
          loop
          preload="auto"
          onPlaying={() => setVideoReady(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
      {/* Véu escuro à esquerda para destacar o texto */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-[7] bg-[linear-gradient(to_bottom,rgb(0_0_0/0.7)_0%,rgb(0_0_0/0.35)_45%,transparent_72%)] md:bg-[linear-gradient(to_right,rgb(0_0_0/0.88)_0%,rgb(0_0_0/0.62)_28%,rgb(0_0_0/0.22)_48%,transparent_62%)]"
      />
      {/* Modelo PH Sports no canto direito (mobile); a camisa 3D fica por cima */}
      <picture>
        {/* celular: foto com a camisa estendida para baixo, a base fica sempre atrás do carrossel */}
        <source media="(min-width: 768px)" srcSet={person} />
        <img
          ref={personRef}
          src={personMobile}
          alt=""
          aria-hidden
          width={834}
          height={2692}
          className="hero-person-in pointer-events-none absolute bottom-0 -right-[25.5%] top-[26vw] -z-[5] h-[244.8vw] w-auto max-w-none object-contain object-right-bottom md:right-[max(calc((100%-80rem)/2-2rem),calc(25%-9rem))] md:top-auto md:h-[min(94%,62rem)]"
        />
      </picture>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 size-full opacity-0"
      />

      <div className="relative z-10 mx-auto h-[max(calc(100vh-28.5px),531.5px)] max-w-7xl px-4 pt-[35vw] md:grid md:h-[max(640px,calc(100svh-28.5px))] md:pt-28 md:grid-cols-2 md:items-center lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-8 md:py-16">
        <div ref={textRef} className="max-md:[zoom:var(--m-scale,1)]">
          <span
            data-hero-extra
            className="hero-reveal inline-flex items-center gap-2 border-l-2 border-white/80 pl-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/90 lg:gap-2.5 lg:pl-4 lg:text-[13px] lg:tracking-[0.2em]"
          >
            Coleção 2026 •{" "}
            <span className="wave-red" aria-label="Edição Premium">
              {[..."Edição Premium"].map((ch, i) => (
                <span key={i} aria-hidden style={{ "--i": i } as React.CSSProperties}>
                  {ch === " " ? "\u00a0" : ch}
                </span>
              ))}
            </span>
          </span>
          <h1
            aria-label={TITLE_LABEL}
            className="hero-serif mt-4 text-[40px] leading-[0.98] md:text-[clamp(3.3rem,5.4vw,5rem)] lg:mt-6 lg:text-[clamp(4.25rem,6.9vw,6.75rem)] lg:leading-[0.94]"
          >
            <SplitTitle />
          </h1>
          <p
            data-hero-extra
            className="hero-reveal mt-4 max-w-md md:mt-5 text-sm leading-relaxed md:text-[15px] text-white/80 lg:mt-7 lg:max-w-[30rem] lg:text-lg xl:max-w-[34rem]"
          >
            Camisas dos maiores clubes do Brasil com acabamento premium. Tudo por{" "}
            <span className="font-black tabular-nums text-white">R$ 179,90</span> na PH Sports.
          </p>
          <div data-hero-extra className="hero-reveal mt-6 flex flex-wrap gap-3 md:mt-8 lg:mt-10 lg:gap-4">
            <Link
              to="/"
              hash="produtos"
              className="btn-glow btn-shine inline-flex items-center gap-2 rounded-full bg-white px-5 py-3.5 md:px-7 text-sm font-bold text-foreground lg:gap-2.5 lg:px-9 lg:py-[1.125rem] lg:text-base shadow-[var(--shadow-raised)]"
            >
              <span className="btn-silver">Comprar agora</span> <ArrowRight className="size-4 lg:size-5" />
            </Link>
            <Link
              to="/"
              hash="clubes"
              className="btn-glow inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3.5 md:px-7 text-sm font-semibold text-white lg:px-9 lg:py-[1.125rem] lg:text-base transition-colors hover:bg-white/20"
            >
              Ver clubes
            </Link>
          </div>
          <div
            data-hero-extra
            className="hero-reveal mt-5 flex flex-wrap items-center gap-5 md:mt-8 text-xs text-white/80 lg:mt-10 lg:gap-7 lg:text-sm"
          >
            <span className="inline-flex items-center gap-1.5">
              <Truck className="size-4 text-white lg:size-[18px]" /> Envio para todo Brasil
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-white lg:size-[18px]" /> Compra 100% segura
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
      {/* Carrossel azul no fim da HERO (celular): fica preso no rodapé da tela enquanto a HERO aparece,
          mesmo quando as barras do navegador aparecem/somem, e encosta no fim dela. */}
      <Ticker className="sticky bottom-0 z-20 md:hidden" />
    </section>
  );
}
