import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { productsQueryOptions } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/busca")({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions),
  head: () => ({
    meta: [
      { title: "Buscar produtos — PH Sports" },
      { name: "description", content: "Pesquise camisas de futebol dos maiores clubes e seleções na PH Sports." },
      { property: "og:title", content: "Buscar produtos — PH Sports" },
      { property: "og:description", content: "Pesquise camisas de futebol dos maiores clubes e seleções na PH Sports." },
    ],
  }),
  component: SearchPage,
});

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const CATEGORY_LABEL: Record<string, string> = {
  masculino: "masculino torcedor",
  feminino: "feminino mulher mulheres",
  retro: "retro classica antiga",
  caneleiras: "caneleira acessorio",
  jogador: "jogador player versao pro",
};

function SearchPage() {
  const { q } = Route.useSearch();
  const { data: products = [] } = useQuery(productsQueryOptions);
  const navigate = useNavigate();
  const [input, setInput] = useState(q);

  const term = normalize(q);
  const tokens = term.split(/\s+/).filter(Boolean);

  const results = !term
    ? []
    : products.filter((p) => {
        const hay = normalize(
          [p.name, p.club, p.category, CATEGORY_LABEL[p.category] ?? "", (p.colors ?? []).join(" ")].join(" "),
        );
        return tokens.every((t) => hay.includes(t));
      });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    navigate({ to: "/busca", search: { q: v } });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <div className="reveal-up mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Busca</p>
        <h1 className="mt-1 text-2xl font-black md:text-3xl">
          {q ? <>Resultados para "<span className="text-brand">{q}</span>"</> : "Pesquisar produtos"}
        </h1>
        {q && (
          <p className="mt-1 text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "produto encontrado" : "produtos encontrados"}
          </p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="mb-8 flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 md:max-w-lg"
      >
        <Search className="size-4 text-muted-foreground" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Buscar clube, camisa, categoria..."
          className="w-full bg-transparent text-sm outline-none"
          aria-label="Buscar produtos"
        />
        <button
          type="submit"
          className="btn-glow rounded-full bg-brand px-4 py-1.5 text-xs font-black uppercase tracking-wider text-brand-foreground"
        >
          Buscar
        </button>
      </form>

      {q && results.length === 0 && (
        <div className="rounded-2xl border border-border bg-secondary/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum produto encontrado para "<span className="font-semibold text-foreground">{q}</span>".
          </p>
          <Link to="/" hash="produtos" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
            Ver todo o catálogo
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid animate-in fade-in duration-300 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((p, i) => (
            <ProductCard key={p.slug} p={p} priority={i < 4} />
          ))}
        </div>
      )}
    </section>
  );
}
