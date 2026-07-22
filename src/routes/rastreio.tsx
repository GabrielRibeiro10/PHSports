import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Truck } from "lucide-react";
import { useEffect } from "react";
import { TRACKING_MESSAGE, whatsappHref } from "@/lib/whatsapp";

export const Route = createFileRoute("/rastreio")({
  head: () => ({
    meta: [
      { title: "Rastrear Pedido — PH Sports" },
      { name: "description", content: "Acompanhe o status e a previsão de entrega do seu pedido PH Sports pelo WhatsApp." },
      { property: "og:title", content: "Rastrear Pedido — PH Sports" },
      { property: "og:description", content: "Fale com nosso time no WhatsApp e receba o rastreamento do seu pedido." },
    ],
  }),
  component: TrackingPage,
});

function TrackingPage() {
  const href = whatsappHref(TRACKING_MESSAGE);

  useEffect(() => {
    const t = window.setTimeout(() => {
      window.location.href = href;
    }, 700);
    return () => window.clearTimeout(t);
  }, [href]);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand/10 text-brand">
        <Truck className="size-7" />
      </div>
      <h1 className="mt-6 text-3xl font-black md:text-4xl">Rastrear pedido</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Vamos te redirecionar para o nosso WhatsApp para consultar o status do seu pedido em tempo real.
      </p>
      <a
        href={href}
        className="btn-glow mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-black text-brand-foreground shadow-md"
      >
        <MessageCircle className="size-4" /> Falar no WhatsApp
      </a>
      <p className="mt-3 text-[11px] text-muted-foreground">Se o redirecionamento não abrir, toque no botão acima.</p>
    </div>
  );
}
