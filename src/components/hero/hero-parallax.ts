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
  if (reduced) return () => {};
  if (!finePointer) return startTouchScrollParallax(section, layers, scene);

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

/**
 * Versão para toque (celular/tablet): as camadas se deslocam em ritmos
 * diferentes enquanto a página desce. Sem listener de scroll — um loop em
 * requestAnimationFrame lê a posição da HERO só enquanto ela está visível.
 */
function startTouchScrollParallax(
  section: HTMLElement,
  layers: ParallaxLayer[],
  scene: ShirtScene | null,
) {
  let raf = 0;
  let visible = false;
  let smooth = 0;

  const frame = () => {
    raf = 0;
    if (!visible) return;
    const r = section.getBoundingClientRect();
    const prog = Math.min(1.2, Math.max(0, -r.top / Math.max(1, r.height))); // 0 no topo → 1 ao sair
    smooth += (prog - smooth) * 0.12;
    const h = r.height;
    for (const { el, factor } of layers) {
      // modelo ganha leve deriva lateral
      const y = smooth * h * ((40 - factor) / 100); // mais distante (fator menor) = rola mais devagar
      const x = factor > 15 ? smooth * factor * 0.8 : 0;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    }
    scene?.setTilt(0, -smooth * 0.8);
    raf = requestAnimationFrame(frame);
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  });
  io.observe(section);

  return () => {
    io.disconnect();
    if (raf) cancelAnimationFrame(raf);
    for (const { el } of layers) el.style.transform = "";
    scene?.setTilt(0, 0);
  };
}
