import { Truck, RefreshCw, Globe2, MessageCircle, ShieldCheck, CreditCard } from "lucide-react";

const items = [
  { icon: Truck, title: "Envio para todo o Brasil", desc: "Rastreamento em todas as encomendas" },
  { icon: Globe2, title: "Envio Internacional", desc: "Levamos a PH Sports pelo mundo" },
  { icon: RefreshCw, title: "Troca fácil", desc: "Devolva sem burocracia" },
  { icon: MessageCircle, title: "Atendimento humanizado", desc: "Suporte real via WhatsApp" },
  { icon: ShieldCheck, title: "Compra 100% segura", desc: "SSL e dados protegidos" },
  { icon: CreditCard, title: "Pix e cartão", desc: "Parcele em até 6x" },
];

export function BenefitsMarquee() {
  const seq = [...items, ...items];
  return (
    <div className="overflow-hidden">
      <div className="benefits-track flex gap-4 pr-4 will-change-transform">
        {seq.map((it, i) => {
          const Icon = it.icon;
          return (
            <div
              key={i}
              className="flex w-72 shrink-0 items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 shadow-[var(--shadow-card)]"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{it.title}</p>
                <p className="truncate text-xs text-muted-foreground">{it.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
