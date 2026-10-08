import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeEmail, checkBackoff, recordFailure, resetBackoff } from "@/lib/input-safety";
import { writeAudit } from "@/lib/audit";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Login — Painel PH Sports" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLoginPage,
});

const BACKOFF_KEY = "admin_login";

// Depois da senha vem a verificação em duas etapas: cadastrar o aplicativo (1ª vez) ou digitar o código.
type Step =
  | { kind: "password" }
  | { kind: "loading" }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "verify"; factorId: string };

function AdminLoginPage() {
  const navigate = useNavigate();
  const { session, isAdmin, mfaVerified, loading } = useAuth();
  const [step, setStep] = useState<Step>({ kind: "password" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const secondFactorStarted = useRef(false);

  const startSecondFactor = async () => {
    setStep({ kind: "loading" });
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError || !data) {
      setError("Não foi possível iniciar a verificação. Recarregue a página e tente de novo.");
      return;
    }
    const verified = data.totp[0];
    if (verified) {
      setStep({ kind: "verify", factorId: verified.id });
      return;
    }
    // Cadastro que ficou pela metade (página recarregada): descarta antes de gerar um QR novo.
    for (const f of data.all) {
      if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Painel PH Sports",
      issuer: "PH Sports",
    });
    if (enrollError || !enrolled) {
      setError("Não foi possível gerar o QR code. Recarregue a página e tente de novo.");
      return;
    }
    setStep({ kind: "enroll", factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
  };

  // Senha aceita e é admin: com o código já validado entra no painel; senão, pede o código.
  useEffect(() => {
    if (loading || !session || !isAdmin) return;
    if (mfaVerified) {
      navigate({ to: "/admin" });
      return;
    }
    if (secondFactorStarted.current) return;
    secondFactorStarted.current = true;
    void startSecondFactor();
  }, [loading, session, isAdmin, mfaVerified, navigate]);

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
      void writeAudit("admin.login.failure", { metadata: { email: cleanEmail } });
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
      void writeAudit("admin.login.failure", { metadata: { email: cleanEmail, reason: "not_admin" } });
      setError("Credenciais inválidas.");
      await supabase.auth.signOut();
      setSubmitting(false);
      return;
    }

    // Senha certa: o efeito acima segue para o código do aplicativo.
    setPassword("");
    setSubmitting(false);
  };

  const onCode = async (e: FormEvent) => {
    e.preventDefault();
    if (step.kind !== "enroll" && step.kind !== "verify") return;
    setError(null);

    const gate = checkBackoff(BACKOFF_KEY);
    if (!gate.ok) {
      setError(`Muitas tentativas. Aguarde ${Math.ceil(gate.retryInMs / 1000)}s antes de tentar novamente.`);
      return;
    }
    const clean = code.replace(/\D/g, "");
    if (clean.length !== 6) {
      setError("Digite os 6 números que aparecem no aplicativo.");
      return;
    }

    setSubmitting(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: step.factorId, code: clean });
    if (verifyError) {
      const { blockedForMs } = recordFailure(BACKOFF_KEY);
      void writeAudit("admin.mfa.failure", { metadata: { email: session?.user.email } });
      setError(
        blockedForMs > 0
          ? `Código inválido. Aguarde ${Math.ceil(blockedForMs / 1000)}s antes de tentar novamente.`
          : "Código inválido ou expirado. Use o código que está aparecendo agora no aplicativo.",
      );
      setCode("");
      setSubmitting(false);
      return;
    }

    resetBackoff(BACKOFF_KEY);
    if (step.kind === "enroll") void writeAudit("admin.mfa.enrolled", { metadata: { email: session?.user.email } });
    void writeAudit("admin.login.success", { metadata: { email: session?.user.email, mfa: true } });
    toast.success("Bem-vindo de volta!");
    setSubmitting(false);
    // A sessão passa a "aal2" e o efeito acima leva ao painel.
  };

  const backToPassword = async () => {
    await supabase.auth.signOut();
    secondFactorStarted.current = false;
    setCode("");
    setError(null);
    setStep({ kind: "password" });
  };

  const codeInput = (
    <div className="grid gap-1.5">
      <Label htmlFor="mfa-code">Código de 6 números</Label>
      <Input
        id="mfa-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        maxLength={7}
        placeholder="000000"
        className="text-center text-lg tracking-[0.4em]"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
      />
    </div>
  );

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/30 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-premium)]">
        <h1 className="text-xl font-black">
          PH<span className="text-brand">SPORTS</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Painel administrativo — acesso restrito.
        </p>

        {step.kind === "password" && (
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
        )}

        {step.kind === "loading" && (
          <div className="mt-6 grid gap-4">
            <p className="text-sm text-muted-foreground">{error ?? "Preparando a verificação em duas etapas…"}</p>
            {error && (
              <Button type="button" variant="outline" onClick={backToPassword}>
                Voltar
              </Button>
            )}
          </div>
        )}

        {step.kind === "enroll" && (
          <form onSubmit={onCode} className="mt-6 grid gap-4">
            <div>
              <h2 className="text-sm font-bold">Ative a verificação em duas etapas</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Só na primeira vez. Depois, todo login pede a senha e o código do celular.
              </p>
            </div>
            <ol className="grid list-decimal gap-1 pl-4 text-xs text-muted-foreground">
              <li>Instale no celular o Google Authenticator (ou Microsoft Authenticator).</li>
              <li>No aplicativo, toque em “+” e escaneie o QR code abaixo.</li>
              <li>Digite o código de 6 números que aparecer.</li>
            </ol>
            <img
              src={step.qr}
              alt="QR code para cadastrar o painel no aplicativo autenticador"
              width={176}
              height={176}
              className="mx-auto rounded-lg border border-border bg-white p-2"
            />
            <p className="text-center text-[11px] text-muted-foreground">
              Não consegue escanear? Digite esta chave no aplicativo:
              <br />
              <code className="select-all break-all font-mono text-xs text-foreground">{step.secret}</code>
            </p>
            {codeInput}
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Verificando…" : "Ativar e entrar"}
            </Button>
            <button type="button" onClick={backToPassword} className="text-xs text-muted-foreground underline">
              Sair
            </button>
          </form>
        )}

        {step.kind === "verify" && (
          <form onSubmit={onCode} className="mt-6 grid gap-4">
            <div>
              <h2 className="text-sm font-bold">Verificação em duas etapas</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Abra o aplicativo autenticador no celular e digite o código de “PH Sports”.
              </p>
            </div>
            {codeInput}
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Verificando…" : "Entrar"}
            </Button>
            <button type="button" onClick={backToPassword} className="text-xs text-muted-foreground underline">
              Sair
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
