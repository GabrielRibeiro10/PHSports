import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import hero from "@/assets/hero-banner.jpg";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { Ticker } from "@/components/Ticker";
import { ProductCarousel } from "@/components/ProductCarousel";
import { BenefitsMarquee } from "@/components/BenefitsMarquee";
import { Reviews } from "@/components/Reviews";
import { ShippingCalc } from "@/components/ShippingCalc";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PH Sports — Camisas de Futebol Premium dos Maiores Clubes" },
      { name: "description", content: "Corinthians, Palmeiras, Flamengo, Vasco, Cruzeiro, Botafogo, São Paulo e Bahia. Camisas premium por R$ 99,90 com troca fácil." },
      { property: "og:title", content: "PH Sports — Camisas de Futebol Premium dos Maiores Clubes" },
      { property: "og:description", content: "Corinthians, Palmeiras, Flamengo, Vasco, Cruzeiro, Botafogo, São Paulo e Bahia. Camisas premium por R$ 99,90 com troca fácil." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <Ticker />
      <Hero />
      <ClubsBar />
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
      <section id="frete" className="mx-auto max-w-7xl px-4 pb-14">
        <div className="mx-auto max-w-xl">
          <div className="mb-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Consulta rápida</p>
            <h2 className="text-2xl font-black md:text-3xl">Calcule seu frete</h2>
          </div>
          <ShippingCalc />
        </div>
      </section>
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-10 md:grid-cols-2 md:py-16">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand">
            Coleção 2026 • Edição Premium
          </span>
          <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Vista as cores do <span className="text-brand">seu clube.</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-primary-foreground/80">
            Camisas dos maiores clubes do Brasil com acabamento premium. Tudo por{" "}
            <span className="font-black text-primary-foreground">R$ 99,90</span> na PH Sports.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/"
              hash="produtos"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground shadow-[var(--shadow-premium)] transition-transform hover:scale-105"
            >
              Comprar agora <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/"
              hash="clubes"
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
            >
              Ver clubes
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-primary-foreground/70">
            <span>✓ Envio para todo Brasil</span>
            <span>✓ Troca fácil</span>
            <span>✓ Atendimento humanizado</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-8 rounded-[2rem] bg-brand/20 blur-3xl" aria-hidden />
          <img
            src={hero}
            alt="Atleta com camisa PH Sports"
            width={1920}
            height={1080}
            fetchPriority="high"
            className="relative aspect-[4/3] w-full rounded-2xl object-cover shadow-[var(--shadow-premium)]"
          />
        </div>
      </div>
    </section>
  );
}

function ClubsBar() {
  return (
    <section id="clubes" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {products.map((p) => (
            <Link
              key={p.slug}
              to="/produto/$slug"
              params={{ slug: p.slug }}
              className="group flex shrink-0 flex-col items-center gap-2"
            >
              <div className="grid size-16 place-items-center overflow-hidden rounded-full border border-border bg-secondary transition-all group-hover:border-brand group-hover:shadow-md md:size-20">
                <img src={p.image} alt={p.club} loading="lazy" className="size-full object-cover" width={200} height={200} />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-brand">{p.club}</span>
            </Link>
          ))}
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
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            filter === null ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
          }`}
        >
          Todos
        </button>
        {products.map((p) => (
          <button
            key={p.slug}
            onClick={() => setFilter(p.club)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
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
