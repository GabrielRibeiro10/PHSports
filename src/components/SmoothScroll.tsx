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
