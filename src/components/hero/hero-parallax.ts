import type { ShirtScene } from "./shirt-scene";

type ParallaxLayer = { el: HTMLElement; factor: number; allowUp?: boolean };

/**
 * Parallax 2.5D da HERO guiado pelo mouse (padrão da skill threejs-parallax):
 * fundo move pouco, modelo move mais, camisa 3D na frente via inclinação da câmera.
 * Sem eventos de scroll. Só em dispositivos com mouse; respeita reduced-motion.
 */
export function startHeroParallax(
  section: HTMLElement,
  layers: ParallaxLayer[],
  scene: ShirtScene | null,
) {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!finePointer || reduced) return () => {};

  let tX = 0;
  let tY = 0;
  let cX = 0;
  let cY = 0;
  let raf = 0;

  const apply = () => {
    for (const { el, factor, allowUp } of layers) {
      const y = allowUp ? cY * factor : Math.max(0, -cY) * factor; // base encostada embaixo: não sobe
      el.style.transform = `translate3d(${(cX * factor).toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    }
    scene?.setTilt(cX, cY);
  };

  const tick = () => {
    cX += (tX - cX) * 0.065;
    cY += (tY - cY) * 0.065;
    apply();
    raf = Math.abs(tX - cX) + Math.abs(tY - cY) > 0.001 ? requestAnimationFrame(tick) : 0;
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const onMove = (e: PointerEvent) => {
    const r = section.getBoundingClientRect();
    tX = ((e.clientX - r.left) / r.width - 0.5) * 2;
    tY = -((e.clientY - r.top) / r.height - 0.5) * 2;
    kick();
  };
  const onLeave = () => {
    tX = 0;
    tY = 0;
    kick();
  };

  section.addEventListener("pointermove", onMove, { passive: true });
  section.addEventListener("pointerleave", onLeave);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    section.removeEventListener("pointermove", onMove);
    section.removeEventListener("pointerleave", onLeave);
    for (const { el } of layers) el.style.transform = "";
  };
}
