import { createFileRoute } from "@tanstack/react-router";
import { Package, Search, Truck } from "lucide-react";
import { useState, type FormEvent } from "react";

export const Route = createFileRoute("/rastreio")({
  head: () => ({
    meta: [
      { title: "Rastrear Pedido — PH Sports" },
      { name: "description", content: "Acompanhe o status e a previsão de entrega do seu pedido PH Sports." },
      { property: "og:title", content: "Rastrear Pedido — PH Sports" },
      { property: "og:description", content: "Consulte o status do seu pedido PH Sports." },
    ],
  }),
  component: TrackingPage,
});

type Status = "idle" | "searching" | "found" | "notfound";

function TrackingPage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    setStatus("searching");
    window.setTimeout(() => {
      setStatus(c.length >= 6 ? "found" : "notfound");
    }, 900);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand/10 text-brand">
          <Truck className="size-7" />
        </div>
        <h1 className="mt-6 text-3xl font-black md:text-4xl">Rastrear pedido</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Informe o código do seu pedido para consultar o status de entrega.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row"
      >
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex.: PHS-2026-000123"
            className="w-full bg-transparent text-sm outline-none"
            aria-label="Código do pedido"
          />
        </div>
        <button
          type="submit"
          className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-black text-brand-foreground shadow-md"
        >
          <Package className="size-4" /> Consultar
        </button>
      </form>

      <a
        href={`https://wa.me/5512992319709?text=${encodeURIComponent("Olá! Gostaria de verificar o rastreamento do meu pedido. Poderiam, por gentileza, me informar o status da entrega? Obrigado(a)!")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-glow reveal-up mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-black text-brand-foreground shadow-md"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.695.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
        Consultar Rastreamento no WhatsApp
      </a>

      <div className="mt-6">
        {status === "searching" && (
          <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            Consultando pedido…
          </div>
        )}
        {status === "found" && (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Pedido</p>
            <p className="mt-1 text-lg font-black">{code}</p>
            <ol className="mt-4 grid gap-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-1 size-2.5 rounded-full bg-brand" />
                <div>
                  <p className="font-bold">Pedido confirmado</p>
                  <p className="text-muted-foreground">Pagamento aprovado.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 size-2.5 rounded-full bg-brand" />
                <div>
                  <p className="font-bold">Em separação</p>
                  <p className="text-muted-foreground">Seu pedido está sendo preparado no nosso centro logístico.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 size-2.5 rounded-full border-2 border-brand bg-background" />
                <div>
                  <p className="font-bold">A caminho</p>
                  <p className="text-muted-foreground">Assim que despachado, o código de rastreio dos Correios/transportadora será enviado por e-mail.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 size-2.5 rounded-full border-2 border-border bg-background" />
                <div>
                  <p className="font-bold">Entregue</p>
                  <p className="text-muted-foreground">Previsão: 3 a 8 dias úteis após o despacho.</p>
                </div>
              </li>
            </ol>
          </div>
        )}
        {status === "notfound" && (
          <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-bold">Não encontramos esse pedido.</p>
            <p className="mt-1 text-muted-foreground">Confira o código recebido por e-mail e tente novamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
