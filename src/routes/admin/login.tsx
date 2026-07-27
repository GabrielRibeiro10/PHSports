import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeEmail, checkBackoff, recordFailure, resetBackoff } from "@/lib/input-safety";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Login — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLoginPage,
});

const BACKOFF_KEY = "admin_login";

function AdminLoginPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session && isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [loading, session, isAdmin, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const gate = checkBackoff(BACKOFF_KEY);
    if (!gate.ok) {
      const secs = Math.ceil(gate.retryInMs / 1000);
      setError(`Muitas tentativas. Aguarde ${secs}s antes de tentar novamente.`);
      return;
    }

    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail || !password || password.length > 200) {
      setError("Credenciais inválidas.");
      return;
    }

    setSubmitting(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (signInError || !data.user) {
      const { blockedForMs } = recordFailure(BACKOFF_KEY);
      setError(
        blockedForMs > 0
          ? `Credenciais inválidas. Aguarde ${Math.ceil(blockedForMs / 1000)}s antes de tentar novamente.`
          : "Credenciais inválidas.",
      );
      setSubmitting(false);
      return;
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      recordFailure(BACKOFF_KEY);
      setError("Credenciais inválidas.");
      await supabase.auth.signOut();
      setSubmitting(false);
      return;
    }

    resetBackoff(BACKOFF_KEY);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/admin" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/30 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-premium)]">
        <h1 className="text-xl font-black">
          PH<span className="text-brand">SPORTS</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Painel administrativo — acesso restrito.
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
