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
