import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, ShoppingBag, Menu, X, Truck } from "lucide-react";
import { useState, type FormEvent, type MouseEvent } from "react";
import { useCart } from "@/lib/cart";
import logo from "@/assets/ph-sports-logo.jpeg.asset.json";

export function Header() {
  const { count } = useCart();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate({ to: "/busca", search: { q: term } });
    setOpen(false);
  };

  const onLogoClick = (e: MouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // let navigation happen, then scroll to top smoothly
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:py-4">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden -ml-1 rounded p-1.5 hover:bg-secondary"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={logo.url} alt="PH Sports" className="size-9 rounded-full object-cover ring-1 ring-border" />
          <span className="text-lg font-black tracking-tight">
            PH<span className="text-brand">SPORTS</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          <Link to="/" hash="produtos" className="hover:text-brand transition-colors">Camisas</Link>
          <Link to="/categoria/$slug" params={{ slug: "mulheres" }} className="hover:text-brand transition-colors">Femininas</Link>
          <Link to="/categoria/$slug" params={{ slug: "retro" }} className="hover:text-brand transition-colors">Retrô</Link>
          <Link to="/categoria/$slug" params={{ slug: "versao-jogador" }} className="hover:text-brand transition-colors">Jogador</Link>
          <Link to="/categoria/$slug" params={{ slug: "caneleiras" }} className="hover:text-brand transition-colors">Caneleiras</Link>
          <Link to="/rastreio" className="hover:text-brand transition-colors">Rastrear</Link>
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden md:flex flex-1 max-w-md items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar camisa, clube..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Buscar produtos"
          />
        </form>

        <Link
          to="/carrinho"
          aria-label="Abrir carrinho"
          className="relative ml-auto md:ml-0 grid size-10 place-items-center rounded-full hover:bg-secondary transition-colors"
        >
          <ShoppingBag className="size-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
              {count}
            </span>
          )}
        </Link>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
            <form onSubmit={onSearch} className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar camisa, clube..."
                className="w-full bg-transparent text-sm outline-none"
                aria-label="Buscar produtos"
              />
            </form>
            <nav className="grid gap-1 text-sm font-medium">
              <Link to="/" hash="produtos" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary">Camisas</Link>
              <Link to="/categoria/$slug" params={{ slug: "mulheres" }} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary">Camisas Femininas</Link>
              <Link to="/categoria/$slug" params={{ slug: "retro" }} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary">Retrô</Link>
              <Link to="/categoria/$slug" params={{ slug: "versao-jogador" }} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary">Versão Jogador</Link>
              <Link to="/categoria/$slug" params={{ slug: "caneleiras" }} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary">Caneleiras</Link>
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
