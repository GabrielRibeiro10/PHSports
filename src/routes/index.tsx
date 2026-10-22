import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandSignature } from "@/components/BrandWordmark";
import { ArrowRight, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { CategoryId, Product } from "@/lib/products";

import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { productsQueryOptions } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { Ticker } from "@/components/Ticker";
import { ProductCarousel } from "@/components/ProductCarousel";
import { MAX_SEARCH_LEN, sanitizeSearch, sanitizeSearchTyping, checkSearchRate } from "@/lib/search-safety";
import { BenefitsMarquee } from "@/components/BenefitsMarquee";
import { Reviews } from "@/components/Reviews";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { VideoBackdrop } from "@/components/VideoBackdrop";
import { crestFor } from "@/lib/crests";
import { Hero } from "@/components/hero/Hero";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions),
  head: () => ({
    meta: [
      { title: "Camisas de Futebol Premium por R$ 179,90 | PH Sports" },
      { name: "description", content: "Camisas premium dos maiores clubes brasileiros por R$ 179,90. Envio para todo o Brasil e atendimento humanizado via WhatsApp." },
      { property: "og:title", content: "Camisas de Futebol Premium por R$ 179,90 | PH Sports" },
      { property: "og:description", content: "Camisas premium dos maiores clubes brasileiros por R$ 179,90. Envio para todo o Brasil e atendimento humanizado via WhatsApp." },
      { property: "og:url", content: "https://www.phsports.com.br/" },
    ],
    links: [{ rel: "canonical", href: "https://www.phsports.com.br/" }],
  }),
  component: Home,
});

function Home() {
  const { data: products = [] } = useQuery(productsQueryOptions);
  return (
    <>
      <Hero />
      {/* No celular o carrossel azul fica dentro da HERO (ver Hero.tsx) */}
      <Ticker className="hidden md:block" />
      <VideoBackdrop>
        <CategoryCarousel />
        <ClubsMarquee />
      </VideoBackdrop>
      <section className="mx-auto max-w-7xl px-4 py-14" id="destaques">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Saindo mais</p>
            <h2 className="text-2xl font-black md:text-3xl">As que a torcida mais leva</h2>
          </div>
          <Link to="/" hash="produtos" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold hover:text-brand">
            Ver todas <ArrowRight className="size-4" />
          </Link>
        </div>
        <ProductCarousel items={products} />
      </section>
      <SearchAndProducts />
      <section id="beneficios" className="border-y border-border bg-secondary/40 py-10">
        <div className="mx-auto max-w-7xl px-4">
          <BenefitsMarquee />
        </div>
      </section>
      <Reviews />
      <BrandTypography />
    </>
  );
}

/** Largura de cada pílula + espaço entre elas (celular), usada para calcular repetição e velocidade. */
const CLUB_PILL_PX = 96;
/** Pixels por segundo da esteira de clubes (igual em qualquer tamanho de catálogo). */
const CLUBS_SPEED = 42;
const MAX_CLUBS = 24;

function ClubsMarquee() {
  const { data: products = [] } = useQuery(productsQueryOptions);
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Uma camisa por clube (a primeira do catálogo), no máximo 24: antes entravam TODAS as camisas
  // em dobro e, com o catálogo grande, a faixa ficava enorme, rápida e pesada (sumia no iPhone).
  const clubs = useMemo(() => {
    const seen = new Set<string>();
    const out: Product[] = [];
    for (const p of products) {
      const key = p.club.trim().toLowerCase();
      if (!p.image || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
      if (out.length === MAX_CLUBS) break;
    }
    return out;
  }, [products]);

  // A sequência se repete até passar da largura da tela grande e vem duplicada: andando -50% emenda sem pulo.
  const reps = clubs.length ? Math.max(1, Math.ceil(1400 / (clubs.length * CLUB_PILL_PX))) : 0;
  const base = Array.from({ length: reps }, () => clubs).flat();
  const loop = [...base, ...base];
  const duration = Math.max(20, (base.length * CLUB_PILL_PX) / CLUBS_SPEED);

  // As fotos começam a baixar quando a seção está chegando na tela (antes, cada foto só baixava
  // ao entrar na faixa e passava vazia).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );
    io.observe(el);
    // Fora da tela a esteira para: antes ela seguia animando (e redesenhando as fotos que
    // entram) mesmo com a pessoa já lá embaixo no catálogo. Muda o estilo direto, sem estado
    // do React: com estado, as 56 pílulas eram redesenhadas no meio da rolagem (travadinha).
    const vis = new IntersectionObserver(([e]) => {
      if (trackRef.current) trackRef.current.style.animationPlayState = e.isIntersecting ? "" : "paused";
    });
    vis.observe(el);
    return () => {
      io.disconnect();
      vis.disconnect();
    };
  }, []);

  if (!clubs.length) return null;

  return (
    <section ref={ref} id="clubes" className="relative pb-10 md:pb-14">
      <div className="mx-auto max-w-7xl px-4">
        {/* Painel escuro translúcido: marca o carrossel sobre o vídeo sem ficar "solto" */}
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/50 py-2.5 shadow-[0_24px_60px_-30px_rgb(0_0_0/0.8)] md:py-3">
          <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
            <div
              ref={trackRef}
              className="clubs-track flex w-max gap-3 md:gap-4"
              style={{ animationDuration: `${duration}s` }}
            >
              {loop.map((p, i) => {
                const copy = i >= clubs.length;
                const crest = crestFor(p.club);
                return (
                  <Link
                    key={`${p.slug}-${i}`}
                    to="/produto/$slug"
                    params={{ slug: p.slug }}
                    className="club-pill group relative block h-[148px] w-[84px] shrink-0 overflow-hidden rounded-b-full bg-gradient-to-b from-transparent via-white/10 to-white/25 md:h-[176px] md:w-[100px]"
                    aria-hidden={copy || undefined}
                    tabIndex={copy ? -1 : undefined}
                  >
                    {crest ? (
                      <img
                        src={crest}
                        alt=""
                        decoding="async"
                        width={40}
                        height={40}
                        className="absolute left-1/2 top-3 z-10 h-5 w-auto max-w-[44%] -translate-x-1/2 object-contain drop-shadow-[0_2px_4px_rgb(0_0_0/0.35)] md:top-4 md:h-6"
                      />
                    ) : (
                      <span className="absolute inset-x-0 top-5 z-10 px-2 text-center text-[10px] font-bold uppercase leading-tight tracking-[0.08em] text-white md:top-6 md:text-[11px]">
                        {p.club}
                      </span>
                    )}
                    {near && (
                      <img
                        src={p.image}
                        alt={copy ? "" : p.club}
                        decoding="async"
                        width={200}
                        height={200}
                        className="absolute inset-x-0 bottom-0 h-[67%] w-full scale-[1.55] object-cover object-[50%_48%] transition-transform duration-500 ease-out [mask-image:linear-gradient(to_bottom,transparent,black_22%)] group-hover:scale-[1.62]"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const BRAZILIAN_CLUBS = new Set([
  "Athletico-PR","Atlético-MG","Bahia","Botafogo","Corinthians","Cruzeiro",
  "Flamengo","Fluminense","Grêmio","Internacional","Palmeiras","Santos",
  "São Paulo","Vasco","Fortaleza",
]);
const EUROPEAN_CLUBS = new Set([
  "Real Madrid","Barcelona","Manchester City","Manchester United","Liverpool",
  "Arsenal","Chelsea","PSG","Bayern de Munique","Juventus","Milan",
  "Inter de Milão","Borussia Dortmund","Atlético de Madrid","Tottenham",
]);
const NATIONAL_TEAMS = new Set([
  "Brasil","Argentina","Portugal","França","Espanha","Alemanha","Itália",
  "Inglaterra","Holanda","Uruguai","Bélgica","Croácia","México","Japão",
]);

type Region = "todos" | "brasileiros" | "europeus" | "selecoes";
type Gender = "todos" | "masculino" | "feminino";

function regionOf(club: string): Region {
  if (NATIONAL_TEAMS.has(club)) return "selecoes";
  if (BRAZILIAN_CLUBS.has(club)) return "brasileiros";
  if (EUROPEAN_CLUBS.has(club)) return "europeus";
  return "todos";
}

/** Stable seeded shuffle so the order stays consistent across "load more" clicks. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Round-robin interleave by category so no category clusters in sequence. */
function interleaveByCategory(items: Product[], seed: number): Product[] {
  const order: CategoryId[] = ["masculino", "feminino", "retro", "jogador"];
  const buckets = new Map<string, Product[]>();
  for (const p of seededShuffle(items, seed)) {
    const key = order.includes(p.category as CategoryId) ? p.category : "outros";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  }
  const keys = [...order.filter((k) => buckets.has(k)), ...[...buckets.keys()].filter((k) => !order.includes(k as CategoryId))];
  const out: Product[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const k of keys) {
      const b = buckets.get(k);
      const next = b?.shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

function SearchAndProducts() {
  const nav = useNavigate();
  const { data: products = [] } = useQuery(productsQueryOptions);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<Region>("todos");
  const [club, setClub] = useState<string>("todos");
  const [gender, setGender] = useState<Gender>("todos");

  // Page size: 28 on desktop, 20 on tablet/mobile. Resolved after mount to avoid SSR mismatch.
  const [pageSize, setPageSize] = useState(20);
  useEffect(() => {
    const apply = () => setPageSize(window.innerWidth >= 1024 ? 28 : 20);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  // Menu "Times"/"Seleções" da header: abre o catálogo já na região escolhida.
  useEffect(() => {
    const apply = (r: unknown) => {
      if (r === "todos" || r === "selecoes") {
        setRegion(r);
        setClub("todos");
      }
    };
    try {
      apply(sessionStorage.getItem("ph-region"));
      sessionStorage.removeItem("ph-region");
    } catch {}
    const onEv = (e: Event) => {
      apply((e as CustomEvent).detail);
      try {
        sessionStorage.removeItem("ph-region");
      } catch {}
    };
    window.addEventListener("ph:region", onEv);
    return () => window.removeEventListener("ph:region", onEv);
  }, []);

  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Shuffled once per page load; stays stable while browsing. Começa fixo (igual no servidor e no
  // cliente, senão a hidratação não bate) e sorteia logo após montar.
  const [seed, setSeed] = useState(7);
  useEffect(() => {
    setSeed(Math.floor(Math.random() * 4294967295) || 7);
  }, []);

  const term = sanitizeSearch(q).toLowerCase();

  // Clubs available inside the currently-selected region (derived from loaded products).
  const clubsInRegion = (() => {
    if (region === "todos") return [] as string[];
    const set = new Set<string>();
    for (const p of products) if (regionOf(p.club) === region) set.add(p.club);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  })();

  const isAllTab = region === "todos" && club === "todos" && gender === "todos" && !term;

  const base = useMemo(
    () => (isAllTab ? interleaveByCategory(products, seed) : products),
    [products, isAllTab, seed],
  );

  const filtered = base.filter((p) => {
    if (region !== "todos" && regionOf(p.club) !== region) return false;
    if (region !== "todos" && club !== "todos" && p.club !== club) return false;
    if (gender === "masculino" && p.category !== "masculino" && p.category !== "jogador" && p.category !== "retro") return false;
    if (gender === "feminino" && p.category !== "feminino") return false;
    if (term && !(p.club.toLowerCase().includes(term) || p.name.toLowerCase().includes(term))) return false;
    return true;
  });

  useEffect(() => {
    setPages(1);
  }, [region, club, gender, term, pageSize]);

  const visibleCount = pages * pageSize;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  const loadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    window.setTimeout(() => {
      setPages((n) => n + 1);
      setLoadingMore(false);
    }, 350);
  };


  const selectRegion = (id: Region) => {
    setRegion(id);
    setClub("todos");
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const t = sanitizeSearch(q).toLowerCase();
    if (!t) return;
    const gate = checkSearchRate();
    if (!gate.ok) {
      toast("Estamos processando suas solicitações. Aguarde alguns instantes antes de tentar novamente.");
      return;
    }
    const hit = filtered.find((p) => p.club.toLowerCase().includes(t) || p.name.toLowerCase().includes(t));
    if (hit) nav({ to: "/produto/$slug", params: { slug: hit.slug } });
  };

  const regionOptions: { id: Region; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "brasileiros", label: "Brasileiros" },
    { id: "europeus", label: "Europeus" },
    { id: "selecoes", label: "Seleções" },
  ];
  const genderOptions: { id: Gender; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "masculino", label: "Masculino" },
    { id: "feminino", label: "Feminino" },
  ];

  return (
    <section id="produtos" className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Catálogo</p>
          <h2 className="text-2xl font-black md:text-3xl">Ache o seu time</h2>
          <p className="mt-1 text-sm text-muted-foreground">Brasileirão, Europa e seleções. Filtra pela região ou digita o nome do clube.</p>
        </div>
        <form onSubmit={onSearch} className="flex w-full items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2.5 transition-colors focus-within:border-foreground/40 focus-within:bg-background md:w-80">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(sanitizeSearchTyping(e.target.value))}
            maxLength={MAX_SEARCH_LEN}
            inputMode="search"
            placeholder="Buscar clube..."
            className="w-full bg-transparent text-sm outline-none"
            aria-label="Buscar clube"
          />
        </form>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
          {regionOptions.map((r) => (
            <button
              key={r.id}
              onClick={() => selectRegion(r.id)}
              aria-pressed={region === r.id}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors duration-200 ${
                region === r.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-foreground/40"
              }`}
            >
              {r.label}
            </button>
          ))}
          <span aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />
          {genderOptions.map((g) => (
            <button
              key={g.id}
              onClick={() => setGender(g.id)}
              aria-pressed={gender === g.id}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors duration-200 ${
                gender === g.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-foreground/40"
              }`}
            >
              {g.id === "todos" ? "Todos os gêneros" : g.label}
            </button>
          ))}
      </div>

      {region !== "todos" && clubsInRegion.length > 0 && (
        <div className="mb-4 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex gap-2 md:flex-wrap">
            <button
              onClick={() => setClub("todos")}
              aria-pressed={club === "todos"}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors duration-200 ${
                club === "todos"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-foreground/40"
              }`}
            >
              Todos
            </button>
            {clubsInRegion.map((c) => (
              <button
                key={c}
                onClick={() => setClub(c)}
                aria-pressed={club === c}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors duration-200 ${
                  club === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-foreground/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}



      <div className="grid animate-in fade-in duration-300 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((p, i) => (
          <ProductCard key={p.slug} p={p} priority={i < 4} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado nesta categoria para a pesquisa realizada.
          </p>
        )}
      </div>

      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            aria-busy={loadingMore}
            className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-70"
          >
            {loadingMore ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                Carregando...
              </>
            ) : (
              <>
                Ver mais camisas <ArrowRight className="size-4" />
              </>
            )}
          </button>
          <p className="text-[11px] font-semibold text-muted-foreground">
            Exibindo {visible.length} de {filtered.length} produtos
          </p>
        </div>
      )}

    </section>
  );
}

function BrandTypography() {
  return <BrandSignature />;
}
