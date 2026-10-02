import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { productsQueryOptions } from "@/lib/catalog";
import { crestFor } from "@/lib/crests";
import { formatBRL, type Product } from "@/lib/products";
import { MAX_SEARCH_LEN, sanitizeSearchTyping } from "@/lib/search-safety";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Destaca o trecho digitado dentro do texto (ignora acentos/maiúsculas). */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const i = norm(text).indexOf(term);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-extrabold text-foreground">
        {text.slice(i, i + term.length)}
      </mark>
      {text.slice(i + term.length)}
    </>
  );
}

const score = (p: Product, t: string) => {
  const club = norm(p.club);
  const name = norm(p.name);
  if (club.startsWith(t)) return 0;
  if (club.includes(t)) return 1;
  if (name.split(/\s+/).some((w) => w.startsWith(t))) return 2;
  if (name.includes(t)) return 3;
  return -1;
};

type Item = { key: string; href: () => void };

/**
 * Campo de busca com sugestões ao digitar (estilo grandes e-commerces):
 * times com escudo, camisas com foto e preço, e atalho para todos os resultados.
 * Teclado: ↑ ↓ navegam, Enter abre, Esc fecha.
 */
export function SearchSuggest({
  value,
  onChange,
  onSubmit,
  onPick,
  variant,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  /** chamado ao escolher uma sugestão (ex.: fechar o menu do celular) */
  onPick?: () => void;
  variant: "bar" | "menu";
}) {
  const { data: products = [] } = useQuery(productsQueryOptions);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const term = norm(value.trim());

  // Times mais presentes no catálogo (para "buscas populares").
  const popular = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of products) count.set(p.club, (count.get(p.club) ?? 0) + 1);
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
      .slice(0, 6)
      .map(([c]) => c);
  }, [products]);

  const { clubs, hits, total } = useMemo(() => {
    if (!term) return { clubs: [] as string[], hits: [] as Product[], total: 0 };
    const ranked = products
      .map((p) => ({ p, s: score(p, term) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => a.s - b.s || a.p.name.localeCompare(b.p.name, "pt-BR"));
    const clubSet: string[] = [];
    for (const { p } of ranked) {
      if (norm(p.club).includes(term) && !clubSet.includes(p.club)) clubSet.push(p.club);
      if (clubSet.length === 4) break;
    }
    return { clubs: clubSet, hits: ranked.slice(0, 6).map((r) => r.p), total: ranked.length };
  }, [products, term]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };
  const pick = () => {
    close();
    inputRef.current?.blur();
    onPick?.();
  };
  const searchFor = (q: string) => {
    pick();
    navigate({ to: "/busca", search: { q } });
  };

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => setActive(-1), [term]);

  const chip =
    "inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-secondary";

  // Lista navegável pelo teclado (na ordem em que aparece).
  const items: Item[] = [];
  const chipsSource = term ? clubs : popular;
  for (const c of chipsSource) items.push({ key: `c-${c}`, href: () => searchFor(c) });
  for (const p of hits)
    items.push({
      key: `p-${p.slug}`,
      href: () => {
        pick();
        navigate({ to: "/produto/$slug", params: { slug: p.slug } });
      },
    });
  if (term && total > 0)
    items.push({ key: "all", href: () => searchFor(value.trim()) });
  const idx = (key: string) => items.findIndex((i) => i.key === key);
  const optProps = (key: string) => {
    const i = idx(key);
    return {
      id: `${listId}-${i}`,
      role: "option" as const,
      "aria-selected": active === i,
      onMouseEnter: () => setActive(i),
      "data-active": active === i || undefined,
    };
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const d = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => {
        const n = a + d;
        return n >= items.length ? -1 : n < -1 ? items.length - 1 : n;
      });
    } else if (e.key === "Enter" && open && active >= 0 && active < items.length) {
      e.preventDefault();
      items[active].href();
    }
  };

  const showPanel = open && (term ? true : popular.length > 0);
  const panelPos =
    variant === "bar"
      ? "right-0 top-[calc(100%+10px)] w-[min(440px,calc(100vw-2rem))]"
      : "left-0 right-0 top-[calc(100%+8px)]";

  return (
    <form
      ref={wrapRef}
      role="search"
      onSubmit={(e) => {
        close();
        onSubmit(e);
      }}
      className={
        variant === "bar"
          ? "relative ml-auto flex flex-1 max-w-sm items-center gap-2 rounded-full border border-black/5 bg-black/[0.04] px-4 py-1.5 transition-colors focus-within:border-foreground/30 focus-within:bg-white"
          : "relative flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2.5 transition-colors focus-within:border-foreground/40 focus-within:bg-background"
      }
    >
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(sanitizeSearchTyping(e.target.value));
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        maxLength={MAX_SEARCH_LEN}
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Busque seu time"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        aria-label="Buscar produtos"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      />
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label="Sugestões de busca"
          className={`search-panel absolute z-50 [text-shadow:none] overflow-hidden rounded-2xl border border-black/5 bg-white text-foreground shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)] ${panelPos}`}
        >
          {/* Times */}
          {chipsSource.length > 0 && (
            <div className="border-b border-border/70 px-4 pb-3.5 pt-3.5">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {term ? "Times" : "Buscas populares"}
              </p>
              <div className="flex flex-wrap gap-2">
                {chipsSource.map((c) => {
                  const crest = crestFor(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      {...optProps(`c-${c}`)}
                      onClick={() => searchFor(c)}
                      className={`${chip} data-[active]:border-foreground/30 data-[active]:bg-secondary`}
                    >
                      {crest ? (
                        <img src={crest} alt="" className="size-4 object-contain" />
                      ) : (
                        <Search className="size-3 text-muted-foreground" />
                      )}
                      <span>
                        <Highlight text={c} term={term} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Camisas */}
          {term && hits.length > 0 && (
            <div className="py-2">
              <p className="px-4 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Camisas
              </p>
              <ul>
                {hits.map((p) => {
                  const crest = crestFor(p.club);
                  return (
                    <li key={p.slug}>
                      <Link
                        to="/produto/$slug"
                        params={{ slug: p.slug }}
                        onClick={pick}
                        {...optProps(`p-${p.slug}`)}
                        className="flex items-center gap-3 px-4 py-2 transition-colors data-[active]:bg-secondary"
                      >
                        <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                          <img
                            src={p.image}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            {crest && <img src={crest} alt="" className="size-3.5 object-contain" />}
                            {p.club}
                          </span>
                          <span className="mt-0.5 block truncate text-sm font-medium text-foreground/80">
                            <Highlight text={p.name} term={term} />
                          </span>
                          <span className="mt-0.5 flex items-baseline gap-2">
                            <span className="text-sm font-black tabular-nums text-foreground">
                              {formatBRL(p.price)}
                            </span>
                            {p.oldPrice > p.price && (
                              <span className="text-[11px] tabular-nums text-muted-foreground line-through">
                                {formatBRL(p.oldPrice)}
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {term && total === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-semibold">Nenhuma camisa para “{value.trim()}”</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Confira a grafia ou tente o nome do time.
              </p>
              {popular.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {popular.slice(0, 4).map((c) => (
                    <button key={c} type="button" onClick={() => searchFor(c)} className={chip}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {term && total > 0 && (
            <button
              type="button"
              {...optProps("all")}
              onClick={() => searchFor(value.trim())}
              className="flex w-full items-center justify-between gap-3 border-t border-border/70 bg-secondary/40 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-secondary data-[active]:bg-secondary"
            >
              <span>
                Ver {total === 1 ? "o resultado" : `todos os ${total} resultados`} para “
                {value.trim()}”
              </span>
              <ArrowRight className="size-4 shrink-0 text-foreground" />
            </button>
          )}
        </div>
      )}
    </form>
  );
}
