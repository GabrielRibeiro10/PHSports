import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Package, Store, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/admin" className="text-lg font-black tracking-tight">
            PH<span className="text-brand">SPORTS</span>{" "}
            <span className="text-muted-foreground font-semibold">admin</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <Link
              to="/admin"
              activeOptions={{ exact: true }}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-secondary [&.active]:bg-secondary"
              activeProps={{ className: "active" }}
            >
              <Package className="size-4" /> Produtos
            </Link>
            <Link
              to="/admin/categorias"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-secondary [&.active]:bg-secondary"
              activeProps={{ className: "active" }}
            >
              <Tag className="size-4" /> Categorias
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{session?.user.email}</span>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-secondary"
            >
              <Store className="size-3.5" /> Ver loja
            </Link>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
