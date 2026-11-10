import { Truck, RefreshCw, Globe2, MessageCircle, ShieldCheck, CreditCard } from "lucide-react";

const items = [
  { icon: Truck, title: "Envio para todo o Brasil", desc: "Código de rastreio em todo pedido" },
  { icon: Globe2, title: "Envio Internacional", desc: "Mora fora? Também mandamos" },
  { icon: RefreshCw, title: "Troca fácil", desc: "7 dias pra trocar, sem formulário" },
  { icon: MessageCircle, title: "Atendimento humanizado", desc: "Quem responde é gente, no WhatsApp" },
  { icon: ShieldCheck, title: "Compra 100% segura", desc: "Site com SSL, seus dados protegidos" },
  { icon: CreditCard, title: "Pix e cartão", desc: "Cartão em até 6x (com juros)" },
];

/** Faixa tipográfica escura (cor do rodapé) com os benefícios; pausa com o mouse em cima. */
export function BenefitsMarquee() {
  const seq = [...items, ...items];
  return (
    <div className="bn overflow-hidden">
      <ul className="benefits-track flex w-max">
        {seq.map((it, i) => {
          const Icon = it.icon;
          return (
            <li key={i} className="bn-item" aria-hidden={i >= items.length || undefined}>
              <Icon className="size-[18px] shrink-0 text-brand" strokeWidth={1.8} />
              <span className="bn-title">{it.title}</span>
              <span className="text-[13px] text-white/45">{it.desc}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
