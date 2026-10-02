import { gsap } from "gsap";
import type { ShirtScene } from "./shirt-scene";

type IntroOptions = {
  section: HTMLElement;
  /** Área de onde a camisa parte (coluna do texto). */
  startEl: HTMLElement;
  /** Área onde a camisa termina (lado direito). */
  endEl: HTMLElement;
  chars: HTMLElement[];
  extras: HTMLElement[];
  scene: ShirtScene | null;
  reducedMotion: boolean;
};

const MOVE_DURATION = 2.4;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Sequência da HERO (somente GSAP Timeline/Tween, disparada no carregamento):
 * camisa grande à esquerda → desliza para a direita diminuindo → letras
 * surgem uma a uma → texto completo → camisa chega → giro 360° infinito.
 */
export function playHeroIntro(o: IntroOptions): () => void {
  const { scene } = o;
  let spin: gsap.core.Tween | null = null;
  let introDone = false;
  let tl: gsap.core.Timeline | null = null;

  // Converte a área de um elemento da página em posição/escala no mundo 3D,
  // sempre mantendo a camisa (e a sombra) inteira dentro do canvas.
  const layout = () => {
    if (!scene) return null;
    const c = scene.canvas.getBoundingClientRect();
    const { w: VW, h: VH } = scene.viewSize();
    const k = VW / c.width; // px → mundo
    const A = scene.shirtAspect;
    const m = Math.max(16, Math.min(c.width, c.height) * 0.04) * k;
    const toWorld = (x: number, y: number) => ({
      x: (x - c.left) * k - VW / 2,
      y: VH / 2 - (y - c.top) * k,
    });
    const fit = (p: { x: number; y: number }, s: number) => ({
      x: clamp(p.x, -VW / 2 + m + (A * s) / 2, VW / 2 - m - (A * s) / 2),
      y: clamp(p.y, -VH / 2 + m + s * 0.66, VH / 2 - m - s / 2),
    });
    const maxS = Math.min((VW - 2 * m) / A, (VH - 2 * m) / 1.16);

    const e = o.endEl.getBoundingClientRect();
    const es = Math.min(maxS, Math.min(e.height * 0.9, (e.width * 0.9) / A) * k);
    const end = fit(toWorld(e.left + e.width / 2, e.top + e.height / 2), es);

    const t = o.startEl.getBoundingClientRect();
    const narrow = c.width < 768;
    const ss = Math.max(
      es,
      Math.min(maxS, es * 1.65, VH * 0.72, narrow ? (VW * 0.78) / A : Infinity),
    );
    const start = fit(
      toWorld(t.left + t.width * 0.4, c.top + c.height * (narrow ? 0.45 : 0.5)),
      ss,
    );
    return { start, ss, end, es };
  };

  const startSpin = () => {
    introDone = true;
    if (!scene || o.reducedMotion || spin) return;
    spin = gsap.to(scene.shirtGroup.rotation, {
      y: "+=" + Math.PI * 2,
      duration: 4,
      ease: "none",
      repeat: -1,
    });
  };

  const placeAtEnd = () => {
    const l = layout();
    if (!scene || !l) return;
    gsap.set(scene.shirtGroup.position, { x: l.end.x, y: l.end.y });
    gsap.set(scene.shirtGroup.scale, { x: l.es, y: l.es, z: l.es });
  };

  // Se o texto já apareceu pelo fallback de CSS (JS lento), não o esconde de novo.
  const textAlreadyVisible = o.chars.length > 0 && getComputedStyle(o.chars[0]).opacity === "1";
  const animateText = !o.reducedMotion && !textAlreadyVisible;

  const ctx = gsap.context(() => {
    if (animateText) {
      gsap.set(o.chars, { opacity: 0, y: 30 });
      gsap.set(o.extras, { opacity: 0, y: 16 });
    }
    o.section.classList.remove("hero-pending");

    const l = layout();
    // Sem a camisa 3D (scene = null) a entrada do texto continua acontecendo normalmente.
    if (o.reducedMotion || (scene && !l)) {
      gsap.set([...o.chars, ...o.extras], { opacity: 1, y: 0 });
      if (scene) gsap.set(scene.canvas, { opacity: 1 });
      placeAtEnd();
      startSpin();
      return;
    }

    if (scene && l) {
      gsap.set(scene.shirtGroup.position, { x: l.start.x, y: l.start.y });
      gsap.set(scene.shirtGroup.scale, { x: l.ss, y: l.ss, z: l.ss });
    }

    const stagger = Math.min(0.038, 0.9 / Math.max(1, o.chars.length - 1));
    tl = gsap.timeline({ onComplete: startSpin });

    if (scene && l) {
      tl.fromTo(
        scene.canvas,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: "power1.out" },
        0,
      );
      tl.to(
        scene.shirtGroup.position,
        { x: l.end.x, y: l.end.y, duration: MOVE_DURATION, ease: "power3.inOut" },
        0,
      );
      tl.to(
        scene.shirtGroup.scale,
        { x: l.es, y: l.es, z: l.es, duration: MOVE_DURATION, ease: "power3.inOut" },
        0,
      );
    }
    if (animateText) {
      tl.to(o.chars, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger }, 0.25);
      tl.to(
        o.extras,
        { opacity: 1, y: 0, duration: 0.55, ease: "power2.out", stagger: 0.085 },
        ">-0.4",
      );
    }
    // Garante a ordem: texto completo → camisa chega → só então o giro.
    if (scene && tl.duration() < MOVE_DURATION)
      tl.to({}, { duration: MOVE_DURATION - tl.duration() });
  }, o.section);

  // Reenquadra quando a largura muda (rotação do aparelho, janela).
  // Mudança só de altura (barra do navegador no celular) não interrompe a entrada.
  let lastW = o.section.clientWidth;
  const ro = new ResizeObserver(() => {
    if (!scene) return;
    scene.resize();
    const w = o.section.clientWidth;
    const widthChanged = Math.abs(w - lastW) > 1;
    lastW = w;
    if (introDone) placeAtEnd();
    else if (widthChanged) {
      tl?.progress(1); // conclui a entrada (onComplete inicia o giro)
      placeAtEnd();
    }
  });
  ro.observe(o.section);

  return () => {
    ro.disconnect();
    spin?.kill();
    ctx.revert();
    scene?.dispose();
  };
}
