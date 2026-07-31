import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Ticket,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/categorias", label: "Categorias", icon: Tag },
  { to: "/admin/marcas", label: "Marcas", icon: BarChart3 },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/cupons", label: "Cupons", icon: Ticket },
  { to: "/admin/avaliacoes", label: "Avaliações", icon: Star },
  { to: "/admin/fretes", label: "Fretes", icon: Truck },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ph-admin-sidebar");
    if (saved === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("ph-admin-sidebar", c ? "0" : "1");
      return !c;
    });
  };

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/admin/login" });
  };

  const nav = (
    <nav className="grid gap-1 px-2">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={"exact" in item ? { exact: item.exact } : undefined}
          onClick={() => setMobileOpen(false)}
          title={collapsed ? item.label : undefined}
          className={cn(
            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-200",
            "hover:translate-x-0.5 hover:bg-secondary hover:text-foreground",
            "[&.active]:bg-primary [&.active]:text-primary-foreground [&.active]:shadow-sm [&.active]:hover:translate-x-0 [&.active]:hover:bg-primary [&.active]:hover:text-primary-foreground",
            collapsed && "lg:justify-center lg:px-0",
          )}
          activeProps={{ className: "active" }}
        >
          <item.icon className="size-4 shrink-0" />
          <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex h-16 items-center gap-2 px-4">
      <Link to="/admin" className="flex min-w-0 items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
          PH
        </span>
        <span className={cn("min-w-0", collapsed && "lg:hidden")}>
          <span className="block truncate text-sm font-black leading-tight">PH SPORTS</span>
          <span className="block text-[11px] font-semibold text-muted-foreground">
            Painel administrativo
          </span>
        </span>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-background transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        {brand}
        <div className="flex-1 overflow-y-auto py-2">{nav}</div>
        <div className="border-t border-border p-2">
          <button
            onClick={toggleCollapsed}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronLeft
              className={cn("size-4 shrink-0 transition-transform", collapsed && "rotate-180")}
            />
            <span className={cn(collapsed && "hidden")}>Recolher</span>
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 animate-in slide-in-from-left flex-col border-r border-border bg-background duration-200">
            <div className="flex items-center justify-between">
              {brand}
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="mr-3 rounded-md p-2 hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">{nav}</div>
          </aside>
        </div>
      )}

      <div className={cn("transition-[padding] duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              className="rounded-md p-2 hover:bg-secondary lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <span className="hidden min-w-0 truncate text-xs font-semibold text-muted-foreground sm:block">
              {session?.user.email}
            </span>
            <div className="col-start-3 flex items-center gap-2">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-px hover:bg-secondary"
              >
                <Store className="size-3.5" /> <span className="hidden sm:inline">Ver loja</span>
              </Link>
              <button
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-px hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-3.5" /> <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
