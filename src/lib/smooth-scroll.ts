import type Lenis from "lenis";

/** Instância global do Lenis (rolagem suave). Fica `null` no servidor, no admin e com "reduzir movimento". */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

/** Volta ao topo com a mesma rolagem suave do site (ou a do navegador, sem Lenis). */
export function scrollToTop() {
  if (instance) instance.scrollTo(0, { duration: 1.2 });
  else window.scrollTo({ top: 0, behavior: "smooth" });
}
