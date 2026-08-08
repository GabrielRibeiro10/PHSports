import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import {
  categoriesQueryOptions,
  getCategoryBySlug,
  productsByCategory,
  productsQueryOptions,
} from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { MAX_SEARCH_LEN, sanitizeSearch, sanitizeSearchTyping } from "@/lib/search-safety";

export const Route = createFileRoute("/categoria/$slug")({
  loader: async ({ params, context }) => {
    const [categories, products] = await Promise.all([
      context.queryClient.ensureQueryData(categoriesQueryOptions),
      context.queryClient.ensureQueryData(productsQueryOptions),
    ]);
    const category = getCategoryBySlug(categories, params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Categoria — PH Sports" }] };
    const { category } = loaderData;
    const title = `${category.name} — PH Sports`;
    const description = `${category.tagline}. Encontre produtos ${category.name.toLowerCase()} na PH Sports com envio para todo o Brasil.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `https://www.phsports.com.br/categoria/${category.slug}` },
      ],
      links: [{ rel: "canonical", href: `https://www.phsports.com.br/categoria/${category.slug}` }],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category: initialCategory } = Route.useLoaderData();
  const { data: categories = [] } = useQuery(categoriesQueryOptions);
  const { data: products = [] } = useQuery(productsQueryOptions);
  const category = getCategoryBySlug(categories, initialCategory.slug) ?? initialCategory;
  const items = productsByCategory(products, category.id);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(term) || p.club.toLowerCase().includes(term),
    );
  }, [q, items]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-brand">Início</Link>
        <ChevronRight className="size-3" />
        <Link to="/" hash="categorias" className="hover:text-brand">Categorias</Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{category.name}</span>
      </nav>

      <header className="mb-6 reveal-up">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand">
          Categoria
        </span>
        <h1 className="mt-3 text-3xl font-black md:text-4xl">{category.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{category.tagline}</p>
      </header>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/categoria/$slug"
              params={{ slug: c.slug }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                c.id === category.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex w-full items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 md:w-80"
          role="search"
        >
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(sanitizeSearchTyping(e.target.value))}
            maxLength={MAX_SEARCH_LEN}
            inputMode="search"
            placeholder={`Buscar em ${category.name}...`}
            className="w-full bg-transparent text-sm outline-none"
            aria-label={`Buscar em ${category.name}`}
          />
        </form>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {q ? `Nenhum produto encontrado para "${q}" em ${category.name}.` : "Nenhum produto cadastrado nesta categoria."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 reveal-up">
          {filtered.map((p: Product, i: number) => (
            <ProductCard key={p.slug} p={p} priority={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
