import { createFileRoute, Link } from "@tanstack/react-router";
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
      <Ticker />
      <CategoryCarousel />
      <ClubsMarquee />
      <SearchAndProducts />
      <section className="mx-auto max-w-7xl px-4 py-14" id="destaques">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Em alta agora</p>
            <h2 className="text-2xl font-black md:text-3xl">Mais vendidas da semana</h2>
          </div>
          <Link to="/" hash="produtos" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold hover:text-brand">
            Ver todas <ArrowRight className="size-4" />
          </Link>
        </div>
        <ProductCarousel items={products} />
      </section>
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

function ClubsMarquee() {
  const { data: products = [] } = useQuery(productsQueryOptions);
  const loop = [...products, ...products];
  return (
    <section id="clubes" className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="overflow-hidden">
          <div className="clubs-track flex w-max gap-6">
            {loop.map((p, i) => (
              <Link
                key={`${p.slug}-${i}`}
                to="/produto/$slug"
                params={{ slug: p.slug }}
                className="group flex shrink-0 flex-col items-center gap-2"
                aria-hidden={i >= products.length ? true : undefined}
              >
                <div className="grid size-16 place-items-center overflow-hidden rounded-full border border-border bg-secondary transition-all group-hover:border-brand group-hover:shadow-md md:size-20">
                  <img src={p.image} alt={p.club} loading="lazy" className="size-full object-cover" width={200} height={200} />
                </div>
                <span className="whitespace-nowrap text-[11px] font-semibold text-muted-foreground group-hover:text-brand">{p.club}</span>
              </Link>
            ))}
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

  // Page size: 40 on desktop, 22 on tablet/mobile. Resolved after mount to avoid SSR mismatch.
  const [pageSize, setPageSize] = useState(22);
  useEffect(() => {
    const apply = () => setPageSize(window.innerWidth >= 1024 ? 40 : 22);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Shuffled once per page load; stays stable while browsing.
  const seed = useRef(Math.floor(Math.random() * 4294967295) || 7).current;

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
          <h2 className="text-2xl font-black md:text-3xl">Camisas dos grandes clubes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Camisas dos grandes clubes a partir de R$ 179,90.</p>
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

      <div className="mb-3">
        <div className="flex flex-wrap gap-2">

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
        </div>
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

      <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-secondary/30 p-3 sm:flex sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Gênero</span>
          {genderOptions.map((g) => (
            <button
              key={g.id}
              onClick={() => setGender(g.id)}
              aria-pressed={gender === g.id}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors duration-200 ${
                gender === g.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-foreground/40"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>


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
            className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-3.5 text-sm font-black uppercase tracking-wider text-brand-foreground shadow-[var(--shadow-premium)] disabled:opacity-70"
          >
            {loadingMore ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                Carregando...
              </>
            ) : (
              <>
                Carregar mais <ArrowRight className="size-4" />
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
  return (
    <section aria-label="PHSPORTS" className="relative overflow-hidden border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-brand">A marca dos torcedores</p>
          <h2
            aria-label="PHSPORTS"
            className="mt-4 select-none whitespace-nowrap text-center text-[15vw] font-black leading-[0.9] tracking-[-0.04em] text-foreground md:text-[13rem]"
          >
            PH<span className="text-brand">SPORTS</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            Paixão, qualidade e velocidade em cada camisa. Feito para quem vive o jogo.
          </p>
        </div>
      </div>
    </section>
  );
}
