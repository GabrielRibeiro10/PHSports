import { Truck, RefreshCw, Globe2, MessageCircle } from "lucide-react";

const items = [
  { icon: RefreshCw, text: "Não serviu? Troca em até 7 dias" },
  { icon: Truck, text: "Mandamos pra todo o Brasil, com rastreio" },
  { icon: Globe2, text: "Mora fora? A gente envia também" },
  { icon: MessageCircle, text: "No WhatsApp quem responde é gente" },
];

export function Ticker({ className = "" }: { className?: string }) {
  const seq = [...items, ...items, ...items, ...items];
  return (
    <div className={`ticker-bar w-full overflow-hidden text-white ${className}`}>
      <div className="flex">
        <div className="ticker-track flex shrink-0 items-center gap-8 whitespace-nowrap py-1.5 pr-8 text-[11px] font-semibold tracking-wide">
          {seq.map((it, i) => {
            const Icon = it.icon;
            return (
              <span key={i} className="inline-flex items-center gap-2">
                <Icon className="size-3 text-white/90" />
                {it.text}
                <span className="text-white/50">•</span>
              </span>
            );
          })}
        </div>
        <div
          className="ticker-track flex shrink-0 items-center gap-8 whitespace-nowrap py-1.5 pr-8 text-[11px] font-semibold tracking-wide"
          aria-hidden="true"
        >
          {seq.map((it, i) => {
            const Icon = it.icon;
            return (
              <span key={i} className="inline-flex items-center gap-2">
                <Icon className="size-3 text-white/90" />
                {it.text}
                <span className="text-white/50">•</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
