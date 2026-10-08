import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const denied = !loading && (!session || !isAdmin);

  useEffect(() => {
    if (denied) navigate({ to: "/admin/login" });
  }, [denied, navigate]);

  if (loading || denied) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Verificando acesso…
      </div>
    );
  }

  return <>{children}</>;
}
