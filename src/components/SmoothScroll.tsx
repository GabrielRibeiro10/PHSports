import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { setLenis } from "@/lib/smooth-scroll";

/**
 * Rolagem contínua e suave (Lenis) na loja. Usa a rolagem nativa do navegador por baixo,
 * então header fixo, botões flutuantes e parallax continuam funcionando. No toque (celular)
 * a rolagem nativa é mantida, que já é suave.
 */
export function SmoothScroll() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let destroy = () => {};
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const lenis = new Lenis({
        autoRaf: true,
        lerp: 0.085,
        smoothWheel: true,
        wheelMultiplier: 1,
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
      });
      setLenis(lenis);
      // Recarregou a página: garante o início, mesmo depois do router e das imagens carregarem.
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (nav?.type === "reload") {
        const toTop = () => lenis.scrollTo(0, { immediate: true, force: true });
        toTop();
        const until = performance.now() + 1200;
        let userScrolled = false;
        const keep = () => {
          if (!userScrolled && window.scrollY !== 0) toTop();
          if (!userScrolled && performance.now() < until) requestAnimationFrame(keep);
        };
        requestAnimationFrame(keep);
        window.addEventListener("load", toTop, { once: true });
        // se a pessoa rolar nesse meio-tempo, não força mais
        const stop = () => {
          userScrolled = true;
          window.removeEventListener("load", toTop);
        };
        window.addEventListener("wheel", stop, { once: true, passive: true });
        window.addEventListener("touchstart", stop, { once: true, passive: true });
      }
      // Ao trocar de página, corta o embalo da rolagem antes do router posicionar a nova página.
      const unsub = router.subscribe("onBeforeNavigate", () => {
        lenis.scrollTo(window.scrollY, { immediate: true, force: true });
      });
      destroy = () => {
        unsub();
        lenis.destroy();
        setLenis(null);
      };
    });
    return () => {
      cancelled = true;
      destroy();
    };
  }, [router]);

  return null;
}
