import { Truck, RefreshCw, Globe2, MessageCircle } from "lucide-react";

const items = [
  { icon: RefreshCw, text: "Troque ou devolva com facilidade" },
  { icon: Truck, text: "Envio rápido para todo o Brasil" },
  { icon: Globe2, text: "Envio Internacional" },
  { icon: MessageCircle, text: "Atendimento Humanizado" },
];

export function Ticker() {
  const seq = [...items, ...items, ...items, ...items];
  return (
    <div className="w-full overflow-hidden bg-primary text-primary-foreground">
      <div className="flex">
        <div className="ticker-track flex shrink-0 items-center gap-10 whitespace-nowrap py-2.5 pr-10 text-xs font-medium tracking-wide">
          {seq.map((it, i) => {
            const Icon = it.icon;
            return (
              <span key={i} className="inline-flex items-center gap-2">
                <Icon className="size-3.5 text-brand" />
                {it.text}
                <span className="text-primary-foreground/30">•</span>
              </span>
            );
          })}
        </div>
        <div className="ticker-track flex shrink-0 items-center gap-10 whitespace-nowrap py-2.5 pr-10 text-xs font-medium tracking-wide" aria-hidden="true">
          {seq.map((it, i) => {
            const Icon = it.icon;
            return (
              <span key={i} className="inline-flex items-center gap-2">
                <Icon className="size-3.5 text-brand" />
                {it.text}
                <span className="text-primary-foreground/30">•</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
