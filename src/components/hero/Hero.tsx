import type React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import hero from "@/assets/hero-banner.jpg";
import posterDesktop from "@/assets/hero-video-d.webp";
import posterMobile from "@/assets/hero-video-m.webp";
import videoDesktopAv1 from "@/assets/hero-video-d-av1.mp4";
import videoDesktopH264 from "@/assets/hero-video-d.mp4";
import videoMobileAv1 from "@/assets/hero-video-m-av1.mp4";
import videoMobileH264 from "@/assets/hero-video-m.mp4";
import person from "@/assets/hero-person.webp";
import personSm from "@/assets/hero-person-640.webp";
import { Ticker } from "@/components/Ticker";

// Uma linha por item: "VISTA AS / CORES DO" na Archivo larga e "seu clube." em serifa itálica vermelha
const TITLE = [
  { text: "Vista as", accent: false },
  { text: "cores do", accent: false },
  { text: "seu clube.", accent: true },
];
const TITLE_LABEL = TITLE.map((t) => t.text).join(" ");

/**
 * Título em linhas; cada palavra é uma máscara e as letras sobem de dentro dela com leve giro
 * (a entrada fica no hero-intro). Embaixo de "seu clube." um traço de pincel vermelho se desenha.
 */
function SplitTitle() {
  let accentIndex = 0; // posição da letra no destaque, para o brilho percorrer da esquerda à direita
  return (
    <>
      {TITLE.map((line, li) => (
        <span key={li} aria-hidden className={`hx-line${line.accent ? " hx-line--accent" : ""}`}>
          {line.text.split(" ").map((w, wi, arr) => (
            <span key={wi}>
              <span className="hx-word">
                {[...w].map((ch, ci) => (
                  <span
                    key={ci}
                    className={`hero-char hero-reveal${line.accent ? " hero-char--accent" : ""}`}
                    style={line.accent ? ({ "--i": accentIndex++ } as React.CSSProperties) : undefined}
                  >
                    {ch}
                  </span>
                ))}
              </span>
              {wi < arr.length - 1 ? " " : null}
            </span>
          ))}
          {line.accent && (
            <svg className="hx-swoosh" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden>
              <path d="M3 16 C 70 8, 160 4, 297 8 C 225 11, 140 15, 62 20 C 38 21.5, 16 21, 3 16 Z" />
            </svg>
          )}
        </span>
      ))}
    </>
  );
}

/** Botão principal: pílula branca com círculo vermelho; no hover o vermelho sobe e enche o botão,
 *  a seta atravessa o círculo e o botão segue levemente o mouse (mesmo efeito do rodapé). */
function HeroCta() {
  const ref = useRef<HTMLSpanElement>(null);
  const move = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${(e.clientX - (r.left + r.width / 2)) * 0.16}px`);
    el.style.setProperty("--my", `${(e.clientY - (r.top + r.height / 2)) * 0.28}px`);
  };
  const reset = () => {
    ref.current?.style.setProperty("--mx", "0px");
    ref.current?.style.setProperty("--my", "0px");
  };
  return (
    <span ref={ref} onPointerMove={move} onPointerLeave={reset} className="hx-magnet">
      <Link to="/" hash="produtos" className="hx-cta">
        <span className="relative">Comprar agora</span>
        <span className="hx-cta__badge" aria-hidden>
          <ArrowUpRight className="hx-cta__arrow" />
          <ArrowUpRight className="hx-cta__arrow hx-cta__arrow--in" />
        </span>
      </Link>
    </span>
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
      {/* Modelo PH Sports no canto direito. No celular a foto termina antes do fim da HERO,
          então a base dela some aos poucos (sem corte seco). */}
      <img
        ref={personRef}
        src={person}
        // Celular com tela menos densa baixa a versão de 640px; telas densas (iPhone) e o
        // computador continuam com a original. Larguras: celular ≈76vw, tablet/PC no máx. 556px.
        srcSet={`${personSm} 640w, ${person} 834w`}
        sizes="(min-width: 768px) 556px, 76vw"
        alt=""
        aria-hidden
        width={834}
        height={1492}
        className="hero-person-in pointer-events-none absolute bottom-0 -right-[25.5%] top-[26vw] -z-[5] h-[135.7vw] w-auto max-w-none object-contain object-right-bottom [mask-image:linear-gradient(to_bottom,black_76%,transparent)] md:right-[-6%] md:top-auto md:h-[min(76%,62rem)] lg:right-[max(calc((100%-80rem)/2-2rem),calc(25%-9rem))] lg:h-[min(94%,62rem)] md:[mask-image:none]"
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 size-full opacity-0"
      />

      <div className="relative z-10 mx-auto h-[max(calc(100vh-28.5px),531.5px)] max-w-7xl px-4 pt-[35vw] md:grid md:h-[max(640px,calc(100svh-28.5px))] md:pt-28 md:grid-cols-2 md:items-center lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-8 md:py-16">
        <div ref={textRef} className="max-md:[zoom:var(--m-scale,1)]">
          {/* Selo: ponto vermelho pulsando, fio que se desenha e a edição */}
          <p data-hero-extra="first" className="hero-reveal hx-eyebrow">
            <span className="hx-dot" aria-hidden />
            <span>Coleção 2026</span>
            <span className="hx-rule" aria-hidden />
            <span className="text-white/60">Edição Premium</span>
          </p>
          <h1
            aria-label={TITLE_LABEL}
            className="hx-title mt-4 text-[31px] md:text-[clamp(2.6rem,min(4.6vw,8.4vh),4.2rem)] lg:mt-[clamp(0.75rem,2.4vh,1.5rem)] lg:text-[clamp(3rem,min(5.6vw,10.4vh),5.6rem)]"
          >
            <SplitTitle />
          </h1>
          <p
            data-hero-extra
            className="hero-reveal hx-lead mt-5 max-w-[16.5rem] text-[13.5px] leading-relaxed md:mt-6 md:max-w-md md:text-[15px] lg:mt-[clamp(1.1rem,3.4vh,2rem)] lg:max-w-[30rem] lg:text-lg xl:max-w-[33rem]"
          >
            Camisas dos maiores clubes do Brasil, com acabamento premium. Todas por{" "}
            <span className="hx-price">R$ 179,90</span>.
          </p>
          <div data-hero-extra className="hero-reveal mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 md:mt-8 lg:mt-[clamp(1.25rem,4vh,2.5rem)]">
            <HeroCta />
            <Link to="/" hash="clubes" className="hx-link">
              <span className="hx-link__label">Ver clubes</span>
              <ArrowRight className="hx-link__arrow size-4 lg:size-[18px]" aria-hidden />
            </Link>
          </div>
          {/* Selos de confiança sob um fio fino */}
          <ul data-hero-extra className="hero-reveal hx-trust mt-6 md:mt-[clamp(1.25rem,4vh,2.25rem)] lg:mt-[clamp(1.25rem,4.4vh,3rem)]">
            <li>
              <Truck aria-hidden /> Envio para todo o Brasil
            </li>
            <li>
              <ShieldCheck aria-hidden /> Compra 100% segura
            </li>
            <li className="hx-trust__extra">
              <RefreshCw aria-hidden /> Troca em 7 dias
            </li>
          </ul>
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
