import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { PackageCheck, Truck, CheckCircle2, Loader2, Package } from "lucide-react";

export const Route = createFileRoute("/rastreio")({
  head: () => ({
    meta: [
      { title: "Rastrear Pedido — PH Sports" },
      { name: "description", content: "Acompanhe o status e a previsão de entrega do seu pedido PH Sports." },
      { property: "og:title", content: "Rastrear Pedido — PH Sports" },
      { property: "og:description", content: "Acompanhe seu pedido em tempo real." },
    ],
  }),
  component: TrackingPage,
});

type Step = { title: string; date: string; done: boolean; icon: typeof Package };

function TrackingPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ code: string; eta: string; steps: Step[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (code.trim().length < 4) {
      setError("Informe um código de pedido válido.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setResult({
      code: code.trim().toUpperCase(),
      eta: "Chega em 3 a 5 dias úteis",
      steps: [
        { title: "Pedido confirmado", date: "hoje, 09:12", done: true, icon: CheckCircle2 },
        { title: "Em preparação", date: "hoje, 14:40", done: true, icon: Package },
        { title: "Enviado", date: "amanhã", done: false, icon: Truck },
        { title: "Entregue", date: "em breve", done: false, icon: PackageCheck },
      ],
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Acompanhamento</p>
        <h1 className="mt-1 text-3xl font-black md:text-4xl">Rastrear Pedido</h1>
        <p className="mt-2 text-sm text-muted-foreground">Digite o código do seu pedido para ver o status atual.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código do Pedido"
          className="flex-1 rounded-md border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
          aria-label="Código do Pedido"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Rastrear
        </button>
      </form>

      {error && <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pedido</p>
              <p className="text-lg font-black">#{result.code}</p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{result.eta}</span>
          </div>

          <ol className="mt-6 space-y-4">
            {result.steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={i} className="flex items-start gap-3">
                  <div className={`grid size-9 shrink-0 place-items-center rounded-full ${s.done ? "bg-brand text-brand-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${s.done ? "" : "text-muted-foreground"}`}>{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.date}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
