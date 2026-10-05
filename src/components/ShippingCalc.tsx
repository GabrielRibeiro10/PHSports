import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Clock, Loader2, Truck } from "lucide-react";
import { formatBRL } from "@/lib/products";
import { quoteShipping } from "@/lib/shipping.functions";
import { isValidCep, maskCep, cepDigits } from "@/lib/shipping/cep";
import { QUOTE_MESSAGES, quoteSignature, type QuoteItem, type QuoteResult, type ShippingOption } from "@/lib/shipping/types";

const CEP_KEY = "phsports.cep";

export type OkQuote = Extract<QuoteResult, { ok: true }>;

function daysLabel(o: ShippingOption) {
  const { min, max } = o.days;
  if (max <= 1) return "1 dia útil após a postagem";
  return min === max ? `${max} dias úteis após a postagem` : `${min} a ${max} dias úteis após a postagem`;
}

/**
 * "Calcule o frete": consulta real (Melhor Envio / Correios) feita no servidor.
 * - Página do produto: só mostra as opções.
 * - Carrinho (`selectable`): o comprador escolhe a modalidade; a escolha é desfeita quando
 *   CEP, produtos ou quantidades mudam (nova cotação automática).
 */
export function ShippingCalc({
  items,
  selectable = false,
  selectedKey = null,
  onSelect,
  onQuote,
  refreshToken = 0,
  className = "",
}: {
  items: QuoteItem[];
  selectable?: boolean;
  selectedKey?: string | null;
  onSelect?: (option: ShippingOption | null, quote: OkQuote | null) => void;
  /** recebe cada nova cotação (ou null enquanto não há cotação válida) */
  onQuote?: (quote: OkQuote | null) => void;
  /** mudar este número força uma nova consulta (ex.: o servidor avisou que o valor mudou) */
  refreshToken?: number;
  className?: string;
}) {
  const quote = useServerFn(quoteShipping);
  const [cep, setCep] = useState("");
  const [editing, setEditing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OkQuote | null>(null);
  const reqId = useRef(0);
  /** modalidade escolhida antes de o carrinho mudar: volta a valer se existir na nova cotação */
  const keepKey = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cbs = useRef({ onSelect, onQuote, selectedKey });
  cbs.current = { onSelect, onQuote, selectedKey };

  const activeItems = items.filter((i) => i.qty > 0);
  const itemsSig = quoteSignature("", activeItems);

  const run = async (rawCep: string) => {
    const digits = cepDigits(rawCep);
    const id = ++reqId.current;
    setError(null);
    if (!isValidCep(digits)) {
      setResult(null);
      cbs.current.onQuote?.(null);
      cbs.current.onSelect?.(null, null);
      setError(QUOTE_MESSAGES.invalid_cep);
      return;
    }
    if (!activeItems.length) return;
    setLoading(true);
    // Enquanto consulta, nenhuma escolha antiga vale para o carrinho atual.
    cbs.current.onQuote?.(null);
    try {
      const r = await quote({ data: { cep: digits, items: activeItems } });
      if (id !== reqId.current) return;
      if (!r.ok) {
        setResult(null);
        setError(r.message);
        setEditing(true);
        cbs.current.onSelect?.(null, null);
        return;
      }
      setResult(r);
      setEditing(false);
      try {
        localStorage.setItem(CEP_KEY, r.cep);
      } catch {}
      cbs.current.onQuote?.(r);
      // Mantém a mesma modalidade se ela continua disponível (com o preço novo); senão desfaz a escolha.
      const prev = cbs.current.selectedKey ?? keepKey.current;
      keepKey.current = null;
      const again = prev ? r.options.find((o) => o.key === prev) : undefined;
      cbs.current.onSelect?.(again ?? null, again ? r : null);
    } catch {
      if (id !== reqId.current) return;
      setResult(null);
      setError(QUOTE_MESSAGES.provider_error);
      cbs.current.onSelect?.(null, null);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  };

  // CEP já usado antes neste aparelho: preenche e calcula sozinho.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CEP_KEY);
      if (saved && isValidCep(saved)) {
        setCep(maskCep(saved));
        void run(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Produtos/quantidades mudaram (ou o servidor pediu nova consulta): recalcula para o mesmo CEP.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const digits = cepDigits(cep);
    // O carrinho mudou: a escolha e o valor antigos deixam de valer na hora (não somam no total).
    keepKey.current = cbs.current.selectedKey ?? keepKey.current;
    cbs.current.onSelect?.(null, null);
    cbs.current.onQuote?.(null);
    if (!isValidCep(digits) || editing) return;
    reqId.current++;
    setLoading(true);
    const t = window.setTimeout(() => void run(digits), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSig, refreshToken]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(cep);
  };

  const change = () => {
    reqId.current++;
    keepKey.current = null;
    setEditing(true);
    setResult(null);
    setError(null);
    setLoading(false);
    cbs.current.onQuote?.(null);
    cbs.current.onSelect?.(null, null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Truck className="size-4 text-foreground" aria-hidden />
        <h3 className="text-sm font-bold">Calcule o frete</h3>
        {result?.environment === "sandbox" && (
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Ambiente de teste
          </span>
        )}
      </div>

      {editing || !result ? (
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={cep}
            onChange={(e) => {
              setCep(maskCep(e.target.value));
              setError(null);
            }}
            placeholder="00000-000"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            aria-label="CEP de entrega"
            aria-invalid={error ? true : undefined}
            className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm tabular-nums outline-none transition-colors focus:border-foreground/40"
          />
          <button
            type="submit"
            disabled={loading || !activeItems.length}
            className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand hover:text-brand-foreground disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Calcular
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm">
          <span className="min-w-0 truncate">
            Entrega para <strong className="tabular-nums">{maskCep(result.cep)}</strong>
            {result.city ? ` · ${result.city}/${result.uf}` : ""}
          </span>
          <button type="button" onClick={change} className="shrink-0 text-xs font-semibold underline underline-offset-2 hover:text-brand">
            Alterar CEP
          </button>
        </div>
      )}

      {(editing || !result) && (
        <a
          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Não sei meu CEP
        </a>
      )}

      {loading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Consultando os Correios…
        </p>
      )}

      {error && !loading && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      {result && !loading && (
        <div className="mt-4 space-y-2">
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border" role={selectable ? "radiogroup" : undefined} aria-label="Opções de frete">
            {result.options.map((o) => {
              const checked = selectable && selectedKey === o.key;
              const body = (
                <>
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {o.name}
                      {o.carrier && o.carrier !== o.name ? <span className="font-normal text-muted-foreground"> · {o.carrier}</span> : null}
                    </span>
                    <span className="block text-xs text-muted-foreground">{daysLabel(o)}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{formatBRL(o.price)}</span>
                </>
              );
              return (
                <li key={o.key}>
                  {selectable ? (
                    <label
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors ${checked ? "bg-secondary" : "hover:bg-secondary/50"}`}
                    >
                      <input
                        type="radio"
                        name="frete"
                        checked={checked}
                        onChange={() => onSelect?.(o, result)}
                        className="size-4 accent-[var(--color-foreground)]"
                      />
                      <span className="flex flex-1 items-center justify-between gap-3">{body}</span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
          {result.prepDays > 0 && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Antes da postagem, levamos {result.prepDays} {result.prepDays === 1 ? "dia útil" : "dias úteis"} para separar e embalar o pedido.
            </p>
          )}
          {result.environment === "sandbox" && (
            <p className="text-[11px] text-amber-700">Valores do ambiente de teste do provedor de frete: não use para compras reais.</p>
          )}
        </div>
      )}
    </div>
  );
}
