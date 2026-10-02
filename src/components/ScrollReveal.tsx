import { useEffect } from "react";

/**
 * Revelação ao rolar (estilo das lojas Shopify premium): títulos, a linha acima deles e os cards
 * sobem 2rem com fade quando entram na tela; itens que entram juntos aparecem em sequência.
 * A HERO, a seção PHSPORTS e o rodapé têm animações próprias e ficam de fora.
 */
const SELECTOR = "main h2, main section p.uppercase, [data-reveal]";
const EXCLUDE = "[data-hero], .wm, .ft, [data-no-reveal]";

export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("js-reveal");
    const seen = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        const shown = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          .sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return Math.round(ra.top - rb.top) || ra.left - rb.left;
          });
        shown.forEach((el, i) => {
          el.style.setProperty("--reveal-delay", `${Math.min(i, 6) * 75}ms`);
          el.setAttribute("data-revealed", "");
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (seen.has(el) || el.closest(EXCLUDE)) return;
        // textos dentro de um card já animado (ou de um link) não animam separado
        if (!el.hasAttribute("data-reveal") && el.parentElement?.closest("[data-reveal], a"))
          return;
        seen.add(el);
        el.setAttribute("data-reveal", "");
        io.observe(el);
      });
    };
    scan();
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(() => ((queued = 0), scan()));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      cancelAnimationFrame(queued);
      root.classList.remove("js-reveal");
      document
        .querySelectorAll("[data-reveal]")
        .forEach((el) => el.setAttribute("data-revealed", ""));
    };
  }, []);
  return null;
}
