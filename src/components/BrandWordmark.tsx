import { useEffect, useId, useRef, useState } from "react";

/**
 * "PHSPORTS" desenhado: contorno traçando as letras ao entrar na tela,
 * preenchimento em seguida e um feixe de luz passando quando a palavra se forma.
 */
export function BrandWordmark({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [inView, setInView] = useState(false);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const text = (
    <>
      PH<tspan className="ph-wm__accent">SPORTS</tspan>
    </>
  );
  const textProps = {
    x: 500,
    y: 158,
    textAnchor: "middle" as const,
    textLength: 980,
    lengthAdjust: "spacingAndGlyphs" as const,
  };

  return (
    <svg
      ref={ref}
      viewBox="0 0 1000 190"
      aria-hidden
      data-in={inView}
      className={`ph-wm block h-auto w-full overflow-visible ${className}`}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <text {...textProps} className="ph-wm__text">
            PHSPORTS
          </text>
        </clipPath>
        <linearGradient id={`${id}-sheen`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <text {...textProps} className="ph-wm__text ph-wm__fill">
        {text}
      </text>
      <text {...textProps} className="ph-wm__text ph-wm__stroke">
        {text}
      </text>
      <g clipPath={`url(#${id}-clip)`}>
        <rect
          className="ph-wm__sheen"
          x="-260"
          y="-20"
          width="220"
          height="230"
          fill={`url(#${id}-sheen)`}
        />
      </g>
    </svg>
  );
}
