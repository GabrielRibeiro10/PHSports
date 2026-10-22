import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { scrollToTop } from "@/lib/smooth-scroll";
import { sanitizeSearch, checkSearchRate } from "@/lib/search-safety";
import { SearchSuggest } from "@/components/SearchSuggest";
import { track } from "@/lib/analytics";
import { PH_SPORTS_LOGO } from "@/lib/brand";

export function Header() {
  const { count } = useCart();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight - 110);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const onDark = pathname === "/" && !scrolled;
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = sanitizeSearch(q);
    if (!term) return;
    const gate = checkSearchRate();
    if (!gate.ok) {
      toast("Estamos processando suas solicitações. Aguarde alguns instantes antes de tentar novamente.");
      return;
    }
    track.search(term);
    navigate({ to: "/busca", search: { q: term } });
    setOpen(false);
  };

  // "Times" e "Seleções" abrem o catálogo já filtrado (região), na home ou vindo de outra página.
  const goRegion = (region: "todos" | "selecoes") => {
    setOpen(false);
    try {
      sessionStorage.setItem("ph-region", region);
    } catch {}
    window.dispatchEvent(new CustomEvent("ph:region", { detail: region }));
  };

  const onLogoClick = (e: MouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    if (pathname === "/") {
      e.preventDefault();
      scrollToTop();
    } else {
      // let navigation happen, then scroll to top smoothly
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  };

  return (
    <header
      data-on-dark={onDark}
      className={`sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        pathname === "/" ? "-mb-[calc(4rem*var(--m-scale,1)+1px)] lg:-mb-[calc(5rem+1px)]" : ""
      } bg-transparent`}
    >
      {/* Cápsula fina de vidro (desktop) que contorna a header depois da HERO, sem esticar até as bordas da tela */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-[15px] hidden px-3 transition-opacity duration-300 lg:block ${
          onDark ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* desfoque leve (8px) e fundo mais branco: com 24px o navegador refazia um desfoque
            grande a cada quadro do vídeo das categorias logo abaixo da HERO e o FPS caía */}
        <div className="mx-auto h-[50px] max-w-7xl rounded-full border border-white/50 bg-white/70 shadow-[0_8px_24px_-14px_rgb(0_0_0/0.35)] backdrop-blur-sm" />
      </div>
      <div className="ph-head-in max-md:[zoom:var(--m-scale,1)] relative mx-auto flex h-16 max-w-7xl items-center gap-2.5 px-3 sm:gap-4 sm:px-4 lg:h-20">
        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          data-open={open}
          className="ph-burger ph-glass grid size-10 shrink-0 place-items-center rounded-full lg:hidden"
        >
          <span className="ph-burger__box" aria-hidden>
            <span className="ph-burger__line ph-burger__line--top" />
            <span className="ph-burger__line ph-burger__line--mid" />
            <span className="ph-burger__line ph-burger__line--bot" />
          </span>
        </button>

        <Link
          to="/"
          onClick={onLogoClick}
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
          className="ph-logo group relative isolate flex shrink-0 cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-3 md:pr-4 transition-transform duration-300 hover:scale-[1.04] active:scale-[0.99]"
        >
          {/* Vidro fosco numa camada separada: com o blur no mesmo elemento da logo, o navegador
              desenhava a foto em baixa qualidade até passar o mouse. */}
          <span
            aria-hidden
            className="ph-glass absolute inset-0 -z-10 rounded-full transition-[filter] duration-300 group-hover:[filter:drop-shadow(0_0_10px_oklch(0.55_0.22_27/0.45))]"
          />
          <img
            src={PH_SPORTS_LOGO}
            alt="PH Sports"
            width={72}
            height={72}
            decoding="async"
            className="size-9 shrink-0 rounded-full object-contain ring-1 ring-border [image-rendering:auto]"
          />
          <span className="text-lg font-black tracking-tight">
            PH<span className="text-brand">SPORTS</span>
          </span>
        </Link>

        <div className="ph-nav hidden lg:flex flex-1 items-center gap-5 px-2 py-2">
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link to="/" hash="produtos" onClick={() => goRegion("todos")} className="hover:text-brand transition-colors">Times</Link>
          <Link to="/" hash="produtos" onClick={() => goRegion("selecoes")} className="hover:text-brand transition-colors">Seleções</Link>
          <Link to="/categoria/$slug" params={{ slug: "mulheres" }} activeProps={{ className: "text-brand" }} className="hover:text-brand transition-colors">Feminino</Link>
          <Link to="/categoria/$slug" params={{ slug: "retro" }} activeProps={{ className: "text-brand" }} className="hover:text-brand transition-colors">Retrô</Link>
          <Link to="/categoria/$slug" params={{ slug: "versao-jogador" }} activeProps={{ className: "text-brand" }} className="hover:text-brand transition-colors">Versão Jogador</Link>
          <Link to="/categoria/$slug" params={{ slug: "caneleiras" }} activeProps={{ className: "text-brand" }} className="hover:text-brand transition-colors">Acessórios</Link>
        </nav>

        <SearchSuggest value={q} onChange={setQ} onSubmit={onSearch} variant="bar" />
        </div>

        <Link
          to="/rastreio"
          aria-label="Rastrear pedido"
          title="Rastrear pedido"
          className="ml-auto lg:ml-0 grid size-10 place-items-center rounded-full ph-glass transition-transform hover:scale-[1.04] lg:size-12"
        >
          <Truck className="size-[20px]" strokeWidth={1.5} />
        </Link>
        <Link
          to="/carrinho"
          aria-label="Abrir carrinho"
          className="ph-bag relative grid size-10 place-items-center rounded-full ph-glass lg:size-12"
        >
          <span className="ph-bag__icon relative block size-[22px]">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-full overflow-visible">
              <path
                className="ph-bag__handle"
                d="M9 8.5V6.75a3 3 0 0 1 6 0V8.5"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="square"
              />
              <path
                d="M4.75 8.5h14.5l-1.1 12.25H5.85L4.75 8.5Z"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinejoin="miter"
              />
            </svg>
            {count > 0 && (
              <span className="ph-bag__count absolute -bottom-1 -right-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-brand px-[3px] text-[9px] font-bold leading-none tabular-nums text-brand-foreground ring-2 ring-background">
                {count}
              </span>
            )}
          </span>
        </Link>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="absolute inset-x-0 top-[calc(4rem*var(--m-scale,1))] px-3 lg:hidden">
          <div className="mx-auto max-w-7xl space-y-3 rounded-3xl bg-white px-4 py-4 text-foreground shadow-[var(--shadow-premium)]">
            <SearchSuggest
              value={q}
              onChange={setQ}
              onSubmit={onSearch}
              onPick={() => setOpen(false)}
              variant="menu"
            />
            <nav className="grid gap-1 text-sm font-medium">
              <Link to="/" hash="produtos" onClick={() => goRegion("todos")} className="rounded-md px-3 py-2 hover:bg-secondary">Times</Link>
              <Link to="/" hash="produtos" onClick={() => goRegion("selecoes")} className="rounded-md px-3 py-2 hover:bg-secondary">Seleções</Link>
              <Link to="/categoria/$slug" params={{ slug: "mulheres" }} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary">Feminino</Link>
              <Link to="/categoria/$slug" params={{ slug: "retro" }} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary">Retrô</Link>
              <Link to="/categoria/$slug" params={{ slug: "versao-jogador" }} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary">Versão Jogador</Link>
              <Link to="/categoria/$slug" params={{ slug: "caneleiras" }} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary">Acessórios</Link>
              <Link to="/rastreio" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary flex items-center gap-2">
                <Truck className="size-4" /> Rastrear pedido
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
