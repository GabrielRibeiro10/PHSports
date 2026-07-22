import { useState, type FormEvent } from "react";
import { Loader2, Truck, CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/lib/products";

type Result = {
  cep: string;
  options: { label: string; price: number; days: string }[];
  free?: boolean;
};

function fakeQuote(cep: string): Result {
  // Deterministic pseudo-random from CEP digits
  const digits = cep.replace(/\D/g, "");
  const sum = digits.split("").reduce((s, d) => s + Number(d), 0);
  const base = 18 + (sum % 25);
  const free = sum % 7 === 0;
  return {
    cep,
    free,
    options: [
      { label: "PAC", price: free ? 0 : base, days: "6 a 10 dias úteis" },
      { label: "SEDEX", price: free ? 0 : base + 12, days: "2 a 4 dias úteis" },
      { label: "Transportadora", price: free ? 0 : base + 6, days: "4 a 7 dias úteis" },
    ],
  };
}

export function ShippingCalc() {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const format = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setError("CEP não encontrado. Verifique os dados e tente novamente.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setResult(fakeQuote(cep));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Truck className="size-4 text-brand" />
        <h3 className="text-sm font-bold">Consultar frete e prazo</h3>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={cep}
          onChange={(e) => setCep(format(e.target.value))}
          placeholder="Digite seu CEP"
          inputMode="numeric"
          aria-label="CEP"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Calcular Frete
        </button>
      </form>
      <a
        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-brand"
      >
        Não sei meu CEP
      </a>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Calculando as melhores opções...
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && !loading && (
        <div className="mt-4 space-y-2">
          {result.free && (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="size-3.5" /> Frete Grátis para {result.cep}
            </div>
          )}
          <ul className="divide-y divide-border rounded-lg border border-border">
            {result.options.map((o) => (
              <li key={o.label} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{o.label}</p>
                  <p className="text-xs text-muted-foreground">{o.days}</p>
                </div>
                <span className={`font-bold ${o.price === 0 ? "text-emerald-600" : ""}`}>
                  {o.price === 0 ? "GRÁTIS" : formatBRL(o.price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
