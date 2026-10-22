import { useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from "react";

/** Mesmo tempo da transição do .carousel-track (700ms) + folga. */
const SLIDE_MS = 720;

/**
 * Carrossel com setas, toque e autoplay, usado nas Categorias e em "As que a torcida mais leva".
 * Loop infinito: os primeiros cards se repetem no fim. Ao chegar neles, o carrossel volta sem
 * animação para os originais (mesma imagem), então sempre anda para o mesmo lado. Antes, o
 * carrossel das camisas voltava do último card para o primeiro passando por todos de uma vez.
 */
export function useLoopCarousel<T>(items: T[], autoplayMs = 3000) {
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(4);
  const [paused, setPaused] = useState(false);
  const [animate, setAnimate] = useState(true);
  const resumeTimer = useRef<number | null>(null);
  const pending = useRef<number | null>(null);
  const indexRef = useRef(0);
  indexRef.current = index;
  const trackRef = useRef<HTMLDivElement>(null);

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

  // Autoplay: para com a aba escondida (não acumula passos para quando a pessoa voltar).
  useEffect(() => {
    if (paused || last <= 0) return;
    const id = window.setInterval(() => {
      if (!document.hidden) step(1);
    }, autoplayMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, loop, n, maxIndex, autoplayMs]);

  useEffect(() => {
    if (index > last) setIndex(0);
  }, [last, index]);

  // Chegou nas cópias do início: troca para os cards originais sem o usuário perceber.
  useEffect(() => {
    if (!loop || index < n) return;
    const t = window.setTimeout(() => jump(index - n, null), SLIDE_MS);
    return () => clearTimeout(t);
  }, [loop, index, n]);

  // Depois de um salto sem animação, religa a transição e faz o passo pendente. Força o
  // navegador a aplicar a posição do salto (leitura de layout) e já religa no mesmo quadro.
  // Antes isso esperava 2 requestAnimationFrame: com o navegador atrasando os quadros (celular
  // lento, aba em segundo plano), o timer de 720 ms acima ganhava a corrida e o carrossel
  // travava sem animação ou pulava para o card errado.
  useLayoutEffect(() => {
    if (animate) return;
    void trackRef.current?.offsetWidth;
    setAnimate(true);
    if (pending.current != null) setIndex(pending.current);
    pending.current = null;
  }, [animate]);

  useEffect(
    () => () => {
      if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    },
    [],
  );

  // Seta ou toque: o autoplay espera 5 s, para não andar logo depois do clique.
  const holdAutoplay = () => {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 5000);
  };

  const nudge = (dir: 1 | -1) => {
    holdAutoplay();
    step(dir);
  };

  // Deslizar o dedo: só conta se o movimento for mais de lado do que para baixo
  // (antes, rolar a página com o dedo meio torto trocava de card sem querer).
  const start = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!start.current) return;
    const dx = e.changedTouches[0].clientX - start.current.x;
    const dy = e.changedTouches[0].clientY - start.current.y;
    start.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    nudge(dx < 0 ? 1 : -1);
  };

  // Mouse em cima: segura o autoplay (quem está olhando não perde o card de vista).
  const hover = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
      setPaused(false);
    },
  };

  return {
    slides,
    n,
    index,
    perView,
    trackRef,
    trackStyle: {
      transform: `translate3d(-${(index * 100) / perView}%, 0, 0)`,
      transition: animate ? undefined : "none",
    },
    dots: loop ? n : maxIndex + 1,
    active: loop ? index % n : index,
    nudge,
    goTo,
    holdAutoplay,
    touch: { onTouchStart, onTouchEnd },
    hover,
  };
}
