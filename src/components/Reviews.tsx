import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Star } from "lucide-react";

const reviews = [
  { name: "Rafael M.", rating: 5, comment: "Qualidade absurda! Camisa parece a original, tecido muito confortável.", club: "Flamengo" },
  { name: "Camila S.", rating: 5, comment: "Chegou super rápido em Ilhabela, super bem embalada. Recomendo demais.", club: "Corinthians" },
  { name: "Diego P.", rating: 5, comment: "Atendimento humano no WhatsApp, tiraram todas as minhas dúvidas.", club: "Palmeiras" },
  { name: "Ana L.", rating: 5, comment: "Presenteei meu pai e ele amou. Costura perfeita, escudo bordado.", club: "Vasco" },
];

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function Stars({ n, size = "size-3.5" }: { n: number; size?: string }) {
  return (
    <span className="flex" aria-label={`${n} de 5 estrelas`}>
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} className={`star-gold ${size}`} style={{ "--i": i } as CSSProperties} aria-hidden />
      ))}
    </span>
  );
}

/**
 * Avaliações em formato editorial (mesma linguagem do rodapé): título com a palavra final em serifa
 * itálica vermelha, nota grande fixa à esquerda e depoimentos numerados à direita, separados por
 * fios que se desenham ao entrar na tela.
 */
export function Reviews() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"static" | "armed" | "in">("static");

  // Mesma regra do rodapé: só anima se a seção ainda vai entrar na tela; com "menos movimento"
  // ou já visível, fica estática sem esconder nada.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;
    setState("armed");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("in");
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} data-rv={state} id="avaliacoes" className="rv mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <p className="rv-label rv-up" style={d(0)}>
              <span className="rv-dot" aria-hidden /> Avaliações reais
            </p>
            <h2 className="rv-title mt-5 md:mt-7">
              <span className="rv-line">
                <span className="rv-line__in" style={d(0.05)}>Quem já recebeu,</span>
              </span>
              <span className="rv-line">
                <span className="rv-line__in rv-title__serif" style={d(0.16)}>conta.</span>
              </span>
            </h2>

            <div className="rv-up mt-10 flex items-end gap-5 md:mt-14" style={d(0.32)}>
              <p className="rv-score" aria-label="Nota média 4,9 de 5">
                4,9<span className="rv-score__of">/5</span>
              </p>
              <div className="pb-3">
                <Stars n={5} size="size-4" />
                <p className="mt-2 max-w-[16rem] text-[13px] leading-snug text-muted-foreground">
                  Nota média de quem comprou e recebeu em casa.
                </p>
              </div>
            </div>
          </div>
        </div>

        <ol className="lg:col-span-7">
          {reviews.map((r, i) => (
            <li key={r.name} className="rv-item" style={d(0.2 + i * 0.12)}>
              <span className="rv-rule" aria-hidden style={d(0.15 + i * 0.12)} />
              <figure className="rv-up grid grid-cols-[2.5rem_1fr] gap-x-3 py-8 md:grid-cols-[3.5rem_1fr] md:py-10" style={d(0.25 + i * 0.12)}>
                <span className="rv-index">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <blockquote className="rv-quote">
                    <span className="rv-quote__mark" aria-hidden>“</span>
                    {r.comment}
                  </blockquote>
                  <figcaption className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span className="rv-avatar" aria-hidden>
                        {r.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                      <span className="leading-tight">
                        <span className="block text-sm font-bold">{r.name}</span>
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Torcedor {r.club}
                        </span>
                      </span>
                    </span>
                    <Stars n={r.rating} />
                  </figcaption>
                </div>
              </figure>
            </li>
          ))}
          <li className="rv-item" aria-hidden>
            <span className="rv-rule" style={d(0.15 + reviews.length * 0.12)} />
          </li>
        </ol>
      </div>
    </section>
  );
}
