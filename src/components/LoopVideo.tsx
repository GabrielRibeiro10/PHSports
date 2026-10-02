import { useEffect, useRef, useState } from "react";

type Sources = { av1: string; h264: string; poster: string };

/**
 * Vídeo de fundo leve: só começa a baixar quando a seção está chegando na tela,
 * cada aparelho baixa só a sua versão (celular recortado / desktop; AV1 quando suportado,
 * senão H.264) e pausa fora da tela. Com "economia de dados" ou "reduzir movimento" fica a imagem.
 */
export function LoopVideo({
  desktop,
  mobile,
  className = "",
}: {
  desktop: Sources;
  mobile: Sources;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    const video = videoRef.current;
    if (!box || !video) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const av1 = video.canPlayType('video/mp4; codecs="av01.0.08M.08"') !== "";
    let near = false;
    let visible = false;
    const load = () => {
      const s = mq.matches ? desktop : mobile;
      const src = av1 ? s.av1 : s.h264;
      if (video.getAttribute("src") === src) return;
      setReady(false);
      video.src = src;
    };
    const sync = () => {
      if (near) load();
      if (visible) void video.play().catch(() => {});
      else video.pause();
    };
    const preload = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          near = true;
          sync();
          preload.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    preload.observe(box);
    io.observe(box);
    const onChange = () => near && sync();
    mq.addEventListener("change", onChange);
    return () => {
      preload.disconnect();
      io.disconnect();
      mq.removeEventListener("change", onChange);
      video.pause();
    };
  }, [desktop, mobile]);

  return (
    <div ref={boxRef} aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      <picture>
        <source media="(min-width: 768px)" srcSet={desktop.poster} />
        <img
          src={mobile.poster}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      </picture>
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="auto"
        onPlaying={() => setReady(true)}
        className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
