import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Loader2, MessageCircle } from "lucide-react";
import { createOrder } from "@/lib/orders.functions";
import type { OrderResult } from "@/lib/orders.server";
import { maskCep } from "@/lib/shipping/cep";
import type { ShippingOption } from "@/lib/shipping/types";
import type { OkQuote } from "@/components/ShippingCalc";

export type CheckoutAddress = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  uf: string;
};
export type CheckoutSuccess = Extract<OrderResult, { ok: true }> & {
  address: CheckoutAddress;
  customer: { name: string; whatsapp: string };
};

function newRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }
}

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-foreground/40 disabled:bg-secondary/60 disabled:text-muted-foreground";

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

/**
 * Dados de entrega + finalização. O CEP vem da cotação escolhida (para trocar, o comprador
 * altera o CEP no frete e recalcula). Preços, cupom e frete são conferidos no servidor.
 */
export function CheckoutForm({
  items,
  quote,
  option,
  coupon,
  onShippingStale,
  onSuccess,
}: {
  items: { slug: string; size: string; qty: number }[];
  quote: OkQuote | null;
  option: ShippingOption | null;
  coupon: string | null;
  /** o servidor achou valor/modalidade diferente: pede nova cotação */
  onShippingStale: () => void;
  /** recebe o pedido salvo; `popup` é a aba aberta no clique (para levar ao WhatsApp) */
  onSuccess: (r: CheckoutSuccess, popup: Window | null) => void;
}) {
  const submit = useServerFn(createOrder);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [addr, setAddr] = useState<Omit<CheckoutAddress, "cep">>({ street: "", number: "", complement: "", district: "", city: "", uf: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCep, setManualCep] = useState("");
  const cep = quote?.cep ?? manualCep.replace(/\D/g, "");
  // Mesma tentativa (mesmos dados) = mesma chave: clique repetido ou nova tentativa não duplica o pedido.
  const attempt = useRef<{ sig: string; id: string } | null>(null);

  // Preenche rua/bairro/cidade pelo CEP (ViaCEP); o comprador pode corrigir.
  useEffect(() => {
    if (cep.length !== 8) return;
    let cancelled = false;
    setAddr((a) => ({ ...a, city: quote?.city || a.city, uf: quote?.uf || a.uf }));
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { erro?: unknown; logradouro?: string; bairro?: string; localidade?: string; uf?: string } | null) => {
        if (cancelled || !b || b.erro) return;
        setAddr((a) => ({
          ...a,
          street: b.logradouro || a.street,
          district: b.bairro || a.district,
          city: b.localidade || a.city,
          uf: b.uf || a.uf,
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cep, quote?.city, quote?.uf]);

  // Nova escolha de frete: o aviso anterior (ex.: "o valor mudou") já foi resolvido.
  useEffect(() => {
    if (option) setError(null);
  }, [option?.key, option?.price]);

  const canSubmit = !sending && cep.length === 8;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    if (quote && !option) {
      setError("Escolha a modalidade de frete (ou altere o CEP).");
      return;
    }
    const address = { cep, ...addr };
    const customer = { name: name.trim(), whatsapp };
    const shipping = option && quote ? { cep, key: option.key, price: option.price } : null;
    const sig = JSON.stringify({ items, address, customer, shipping, coupon });
    if (!attempt.current || attempt.current.sig !== sig) attempt.current = { sig, id: newRequestId() };

    // Abre a aba no clique (navegadores bloqueiam abrir depois de esperar o servidor);
    // ela só vai para o WhatsApp se o pedido for salvo.
    const popup = window.matchMedia("(pointer: fine)").matches ? window.open("", "_blank") : null;
    setSending(true);
    try {
      const r = await submit({
        data: { requestId: attempt.current.id, items, shipping, customer, address, coupon: coupon ?? undefined },
      });
      if (!r.ok) {
        popup?.close();
        setError(r.message);
        if (r.code === "shipping_changed" || r.code === "shipping_unavailable" || r.code === "quote_failed") onShippingStale();
        return;
      }
      onSuccess({ ...r, address, customer }, popup);
    } catch {
      popup?.close();
      setError("Não conseguimos registrar o pedido. Confira nome, WhatsApp com DDD e endereço e tente de novo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados de entrega</p>
      <div className="grid gap-2">
        <input className={input} required minLength={2} maxLength={120} autoComplete="name" placeholder="Nome completo" aria-label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className={input}
          required
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="WhatsApp com DDD"
          aria-label="WhatsApp com DDD"
          pattern="\(\d{2}\) \d{4,5}-\d{4}"
          title="Informe o WhatsApp com DDD, ex.: (12) 99999-0000"
          value={whatsapp}
          onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
        />
        {quote ? (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input className={input} disabled value={maskCep(quote.cep)} aria-label="CEP de entrega" />
            <span className="self-center text-[11px] text-muted-foreground">mude no frete</span>
          </div>
        ) : (
          <input
            className={input}
            required
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="CEP de entrega"
            aria-label="CEP de entrega"
            pattern="\d{5}-\d{3}"
            value={maskCep(manualCep)}
            onChange={(e) => setManualCep(e.target.value)}
          />
        )}
        <input className={input} required maxLength={160} autoComplete="address-line1" placeholder="Rua / avenida" aria-label="Rua" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} />
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <input className={input} required maxLength={20} placeholder="Número" aria-label="Número" value={addr.number} onChange={(e) => setAddr({ ...addr, number: e.target.value })} />
          <input className={input} maxLength={80} autoComplete="address-line2" placeholder="Complemento (opcional)" aria-label="Complemento" value={addr.complement} onChange={(e) => setAddr({ ...addr, complement: e.target.value })} />
        </div>
        <input className={input} required maxLength={80} placeholder="Bairro" aria-label="Bairro" value={addr.district} onChange={(e) => setAddr({ ...addr, district: e.target.value })} />
        <div className="grid grid-cols-[1fr_72px] gap-2">
          <input className={input} required maxLength={80} autoComplete="address-level2" placeholder="Cidade" aria-label="Cidade" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
          <input
            className={`${input} uppercase`}
            required
            minLength={2}
            maxLength={2}
            autoComplete="address-level1"
            placeholder="UF"
            aria-label="UF"
            value={addr.uf}
            onChange={(e) => setAddr({ ...addr, uf: e.target.value.replace(/[^a-z]/gi, "").toUpperCase() })}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand hover:text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MessageCircle className="size-4" aria-hidden />}
        {sending ? "Registrando pedido…" : "Finalizar pelo WhatsApp"}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        {option
          ? "Conferimos preços, estoque e frete, registramos o pedido e abrimos o WhatsApp da loja. O pagamento é combinado por lá."
          : "Sem frete calculado, o frete é combinado no WhatsApp e somado antes do pagamento."}
      </p>
    </form>
  );
}
