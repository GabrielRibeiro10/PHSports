import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Star } from "lucide-react";
import { getGoogleReviews, type GoogleReview } from "@/lib/google-reviews.functions";

function Stars({ n, size = "size-3.5" }: { n: number; size?: string }) {
  return (
    <div className="flex" aria-label={`${n} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden
          className={`${size} ${i < Math.round(n) ? "star-gold" : "fill-muted text-muted"}`}
          style={{ "--i": i } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function GoogleG({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function ReviewCard({ r }: { r: GoogleReview }) {
  const initials = r.author
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        {r.photo ? (
          <img
            src={r.photo}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {r.profileUrl ? (
            <a
              href={r.profileUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="block truncate text-sm font-bold hover:underline"
            >
              {r.author}
            </a>
          ) : (
            <p className="truncate text-sm font-bold">{r.author}</p>
          )}
          <p className="text-[11px] text-muted-foreground">{r.when}</p>
        </div>
        <GoogleG />
      </div>
      <div className="mt-3">
        <Stars n={r.rating} />
      </div>
      <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-foreground/80">{r.text}</p>
    </article>
  );
}

/** Avaliações reais do Google (Perfil da Empresa). Sem dados, a seção não aparece. */
export function Reviews() {
  const { data } = useQuery({
    queryKey: ["google-reviews"],
    queryFn: () => getGoogleReviews(),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  if (!data || !data.reviews.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Avaliações no Google</p>
          <h2 className="text-2xl font-black md:text-3xl">Quem já recebeu, conta</h2>
        </div>
        <div className="flex items-center gap-3">
          <GoogleG className="size-7" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tabular-nums">
                {data.rating.toFixed(1).replace(".", ",")}
              </span>
              <Stars n={data.rating} size="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              {data.total} {data.total === 1 ? "avaliação" : "avaliações"} no Google
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.reviews.slice(0, 6).map((r, i) => (
          <ReviewCard key={i} r={r} />
        ))}
      </div>

      {data.url && (
        <div className="mt-8 flex justify-center">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-6 py-3 text-sm font-semibold transition-colors hover:border-foreground/40"
          >
            Ver todas no Google <ArrowUpRight className="size-4" />
          </a>
        </div>
      )}
    </section>
  );
}
