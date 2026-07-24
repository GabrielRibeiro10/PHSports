import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search, ShieldCheck, Truck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import hero from "@/assets/hero-banner.jpg";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { Ticker } from "@/components/Ticker";
import { ProductCarousel } from "@/components/ProductCarousel";
import { BenefitsMarquee } from "@/components/BenefitsMarquee";
import { Reviews } from "@/components/Reviews";
import { CategoryCarousel } from "@/components/CategoryCarousel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PH Sports — Camisas de Futebol Premium dos Maiores Clubes" },
      { name: "description", content: "Camisas premium dos maiores clubes brasileiros por R$ 99,90. Envio para todo o Brasil e atendimento humanizado via WhatsApp." },
      { property: "og:title", content: "PH Sports — Camisas de Futebol Premium dos Maiores Clubes" },
      { property: "og:description", content: "Camisas premium dos maiores clubes brasileiros por R$ 99,90 na PH Sports." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <Ticker />
      <Hero />
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

function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand">
            Coleção 2026 • Edição Premium
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-tight text-foreground md:text-6xl">
            Vista as cores do <span className="text-brand">seu clube.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground">
            Camisas dos maiores clubes do Brasil com acabamento premium. Tudo por{" "}
            <span className="font-black text-foreground">R$ 99,90</span> na PH Sports.
          </p>
          <div className="mt-6 inline-flex items-baseline gap-2 rounded-full border border-brand/30 bg-brand/5 px-4 py-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand">A partir de</span>
            <span className="text-2xl font-black tracking-tight text-foreground md:text-3xl">R$ 180,00</span>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/"
              hash="produtos"
              className="btn-glow inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-bold text-brand-foreground shadow-[var(--shadow-premium)]"
            >
              Comprar agora <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/"
              hash="clubes"
              className="btn-glow inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 text-sm font-semibold text-foreground hover:border-primary"
            >
              Ver clubes
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Truck className="size-4 text-brand" /> Envio para todo Brasil</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand" /> Compra 100% segura</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-secondary/60 to-brand/5 blur-2xl" aria-hidden />
          <img
            src={hero}
            alt="Coleção premium PH Sports — camisa, chuteira e bola de futebol"
            width={1600}
            height={1200}
            fetchPriority="high"
            className="relative aspect-[4/3] w-full rounded-2xl bg-white object-cover shadow-[var(--shadow-premium)] ring-1 ring-border"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5 md:p-7">
            <p className="max-w-md text-sm font-semibold leading-snug text-white md:text-base">
              Os melhores produtos esportivos para quem vive a paixão pelo esporte.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClubsMarquee() {
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

function SearchAndProducts() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? products.filter((p) => p.club === filter) : products;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const t = q.trim().toLowerCase();
    if (!t) return;
    const hit = products.find((p) => p.club.toLowerCase().includes(t) || p.name.toLowerCase().includes(t));
    if (hit) nav({ to: "/produto/$slug", params: { slug: hit.slug } });
  };

  return (
    <section id="produtos" className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Catálogo</p>
          <h2 className="text-2xl font-black md:text-3xl">Camisas dos grandes clubes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Todas por R$ 99,90 com etiqueta de promoção.</p>
        </div>
        <form onSubmit={onSearch} className="flex w-full items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 md:w-80">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar clube..."
            className="w-full bg-transparent text-sm outline-none"
            aria-label="Buscar clube"
          />
        </form>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
            filter === null ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
          }`}
        >
          Todos
        </button>
        {products.map((p) => (
          <button
            key={p.slug}
            onClick={() => setFilter(p.club)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
              filter === p.club ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
            }`}
          >
            {p.club}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p, i) => (
          <ProductCard key={p.slug} p={p} priority={i < 4} />
        ))}
      </div>
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
            className="mt-4 select-none bg-gradient-to-b from-foreground via-foreground to-foreground/10 bg-clip-text text-[19vw] font-black leading-none tracking-tighter text-transparent md:text-[13rem]"
          >
            PH<span className="text-brand [-webkit-text-fill-color:currentColor]">SPORTS</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            Paixão, qualidade e velocidade em cada camisa. Feito para quem vive o jogo.
          </p>
        </div>
      </div>
    </section>
  );
}
