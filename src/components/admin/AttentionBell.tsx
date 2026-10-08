import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BellRing, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAttention } from "@/lib/attention";
import { cn } from "@/lib/utils";

const DOT = { warning: "bg-amber-500", info: "bg-sky-500", danger: "bg-destructive" } as const;

export function AttentionBell() {
  const { items, urgent, loading, error, refetch } = useAttention();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const canNotify = typeof Notification !== "undefined" && Notification.permission === "default";
  const total = items.reduce((n, i) => n + i.count, 0);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) void refetch(); }}>
      <PopoverTrigger asChild>
        <button
          aria-label={total ? `Avisos: ${total} itens precisam de atenção` : "Avisos: nada pendente"}
          className="relative inline-flex size-9 items-center justify-center rounded-lg border border-border transition-all hover:-translate-y-px hover:bg-secondary"
        >
          {urgent > 0 ? <BellRing className="size-4" /> : <Bell className="size-4" />}
          {total > 0 && (
            <span className={cn("absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-black text-white", urgent > 0 ? "bg-destructive" : "bg-amber-500")}>
              {total > 99 ? "99+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-bold">O que precisa de atenção</p>
          <p className="text-xs text-muted-foreground">Atualiza sozinho a cada minuto.</p>
        </div>
        {error ? (
          <p className="px-4 py-6 text-center text-sm text-destructive">Não foi possível carregar os avisos.</p>
        ) : loading ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-1 px-4 py-8 text-center">
            <CheckCircle2 className="size-6 text-emerald-600" />
            <p className="text-sm font-bold">Tudo em dia</p>
            <p className="text-xs text-muted-foreground">Nenhum pedido, pagamento ou estoque pedindo atenção.</p>
          </div>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {items.map((i) => (
              <li key={i.id}>
                <button
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
                  onClick={() => { setOpen(false); void navigate({ to: i.to, search: i.search } as never); }}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[i.tone])} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{i.title}</span>
                    <span className="block text-xs text-muted-foreground">{i.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {canNotify && (
          <div className="border-t border-border p-3">
            <button
              className="w-full rounded-lg border border-border px-3 py-2 text-xs font-bold transition-colors hover:bg-secondary"
              onClick={() => void Notification.requestPermission().then(() => setOpen(false))}
            >
              Avisar no computador quando chegar pedido novo
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
