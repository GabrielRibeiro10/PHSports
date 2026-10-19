import { Star } from "lucide-react";
import { PH_SPORTS_LOGO } from "@/lib/brand";

const reviews = [
  { name: "Rafael M.", rating: 5, comment: "Qualidade absurda! Camisa parece a original, tecido muito confortável.", club: "Flamengo" },
  { name: "Camila S.", rating: 5, comment: "Chegou super rápido em Ilhabela, super bem embalada. Recomendo demais.", club: "Corinthians" },
  { name: "Diego P.", rating: 5, comment: "Atendimento humano no WhatsApp, tiraram todas as minhas dúvidas.", club: "Palmeiras" },
  { name: "Ana L.", rating: 5, comment: "Presenteei meu pai e ele amou. Costura perfeita, escudo bordado.", club: "Vasco" },
];

export function Reviews() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Avaliações reais</p>
          <h2 className="text-2xl font-black md:text-3xl">Quem já recebeu, conta</h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="star-gold size-4" style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>
          <span className="font-bold">4.9/5</span>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {reviews.map((r, i) => (
          <article
            key={i}
            className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]"
          >
            {/* ticket notches */}
            <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
            <span className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />

            <div className="flex items-center justify-between border-b border-dashed border-border bg-primary px-4 py-3 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-full bg-brand text-brand-foreground text-xs font-black">
                  {r.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-bold">{r.name}</p>
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Torcedor {r.club}</p>
                </div>
              </div>
              <img src={PH_SPORTS_LOGO} alt="PH Sports" width={24} height={24} loading="lazy" className="size-6 rounded-full bg-white object-cover ring-1 ring-white/30" />
            </div>
            <div className="flex-1 p-4">
              <div className="mb-2 flex">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="star-gold size-3.5" style={{ "--i": i } as React.CSSProperties} />
                ))}
              </div>
              <p className="text-sm text-foreground/80">"{r.comment}"</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
