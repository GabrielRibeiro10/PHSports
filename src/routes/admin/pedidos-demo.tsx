import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Package,
  PackageCheck,
  Search,
  Send,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, EmptyState, PageHeader, StatCard } from "@/components/admin/AdminUI";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/pedidos-demo")({
  head: () => ({
    meta: [
      { title: "Pedidos (Demonstração) — Painel PH Sports" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <OrdersDemoPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

/* ---------------------------------- demo data ---------------------------------- */

type PayStatus = "aguardando" | "pago" | "recusado";
type OrderStage = "aguardando" | "preparacao" | "enviado" | "entregue" | "cancelado";

type DemoOrder = {
  code: string;
  customer: string;
  whatsapp: string;
  total: number;
  payment: "PIX";
  payStatus: PayStatus;
  stage: OrderStage;
  createdAt: string;
  address: string;
  tracking: string;
  items: { name: string; size: string; qty: number; price: number }[];
};

const DEMO_ORDERS: DemoOrder[] = [
  {
    code: "#PH1001",
    customer: "João Silva",
    whatsapp: "(12) 99999-0001",
    total: 179.9,
    payment: "PIX",
    payStatus: "pago",
    stage: "preparacao",
    createdAt: "2026-08-10T14:20:00",
    address: "Rua das Palmeiras, 120 — Jardim Aquarius, São José dos Campos/SP — 12246-000",
    tracking: "PH000000001BR — aguardando postagem",
    items: [{ name: "Camisa Palmeiras", size: "G", qty: 1, price: 179.9 }],
  },
  {
    code: "#PH1002",
    customer: "Pedro Santos",
    whatsapp: "(12) 99999-0002",
    total: 359.8,
    payment: "PIX",
    payStatus: "aguardando",
    stage: "aguardando",
    createdAt: "2026-08-10T18:05:00",
    address: "Av. Andrômeda, 55 — Bosque dos Eucaliptos, São José dos Campos/SP — 12233-000",
    tracking: "Disponível após confirmação do pagamento",
    items: [
      { name: "Camisa Flamengo", size: "M", qty: 1, price: 179.9 },
      { name: "Camisa Corinthians", size: "GG", qty: 1, price: 179.9 },
    ],
  },
  {
    code: "#PH1003",
    customer: "Lucas Oliveira",
    whatsapp: "(12) 99999-0003",
    total: 179.9,
    payment: "PIX",
    payStatus: "pago",
    stage: "enviado",
    createdAt: "2026-08-09T09:40:00",
    address: "Rua Ipê Amarelo, 340 — Vila Ema, São José dos Campos/SP — 12243-000",
    tracking: "PH000000003BR — objeto em trânsito",
    items: [{ name: "Camisa Santos Retrô", size: "P", qty: 1, price: 179.9 }],
  },
  {
    code: "#PH1004",
    customer: "Marcos Souza",
    whatsapp: "(12) 99999-0004",
    total: 179.9,
    payment: "PIX",
    payStatus: "pago",
    stage: "entregue",
    createdAt: "2026-08-06T11:15:00",
    address: "Rua Minas Gerais, 88 — Centro, Taubaté/SP — 12010-000",
    tracking: "PH000000004BR — entregue em 08/08/2026",
    items: [{ name: "Camisa São Paulo", size: "M", qty: 1, price: 179.9 }],
  },
  {
    code: "#PH1005",
    customer: "Rafael Lima",
    whatsapp: "(12) 99999-0005",
    total: 179.9,
    payment: "PIX",
    payStatus: "recusado",
    stage: "cancelado",
    createdAt: "2026-08-05T20:00:00",
    address: "Rua Bahia, 12 — Jardim Satélite, São José dos Campos/SP — 12230-000",
    tracking: "Pedido cancelado",
    items: [{ name: "Camisa Grêmio Versão Jogador", size: "G", qty: 1, price: 179.9 }],
  },
];

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "aguardando-pag", label: "Aguardando pagamento" },
  { key: "pago", label: "Pago" },
  { key: "preparacao", label: "Em preparação" },
  { key: "enviado", label: "Enviado" },
  { key: "entregue", label: "Entregue" },
  { key: "cancelado", label: "Cancelado" },
] as const;

const STAGE_LABEL: Record<OrderStage, string> = {
  aguardando: "Aguardando",
  preparacao: "Em preparação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STAGE_TONE: Record<OrderStage, string> = {
  aguardando: "border-amber-500/25 bg-amber-500/10 text-amber-600",
  preparacao: "border-sky-500/25 bg-sky-500/10 text-sky-600",
  enviado: "border-indigo-500/25 bg-indigo-500/10 text-indigo-600",
  entregue: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600",
  cancelado: "border-destructive/25 bg-destructive/10 text-destructive",
};

const PAY_META: Record<PayStatus, { label: string; dot: string; tone: string }> = {
  aguardando: {
    label: "Aguardando pagamento",
    dot: "bg-amber-500",
    tone: "border-amber-500/25 bg-amber-500/10 text-amber-600",
  },
  pago: {
    label: "Pagamento confirmado",
    dot: "bg-emerald-500",
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600",
  },
  recusado: {
    label: "Pagamento recusado",
    dot: "bg-destructive",
    tone: "border-destructive/25 bg-destructive/10 text-destructive",
  },
};

const TIMELINE: { stage: OrderStage | "criado"; label: string }[] = [
  { stage: "criado", label: "Pedido criado" },
  { stage: "aguardando", label: "Pagamento confirmado" },
  { stage: "preparacao", label: "Em preparação" },
  { stage: "enviado", label: "Enviado" },
  { stage: "entregue", label: "Entregue" },
];

function timelineIndex(o: DemoOrder) {
  if (o.stage === "cancelado") return 0;
  if (o.payStatus !== "pago") return 0;
  const order: OrderStage[] = ["aguardando", "preparacao", "enviado", "entregue"];
  return order.indexOf(o.stage) + 1;
}

function digits(v: string) {
  return v.replace(/\D/g, "");
}

/* ------------------------------------ page ------------------------------------ */

function OrdersDemoPage() {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<DemoOrder | null>(null);
  const [waDialog, setWaDialog] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const termDigits = digits(q);
    return DEMO_ORDERS.filter((o) => {
      if (filter === "aguardando-pag" && o.payStatus !== "aguardando") return false;
      if (filter === "pago" && o.payStatus !== "pago") return false;
      if (["preparacao", "enviado", "entregue", "cancelado"].includes(filter) && o.stage !== filter)
        return false;
      if (!term) return true;
      const matchesText =
        o.code.toLowerCase().includes(term) || o.customer.toLowerCase().includes(term);
      const matchesPhone = termDigits.length >= 3 && digits(o.whatsapp).includes(termDigits);
      return matchesText || matchesPhone;
    });
  }, [filter, q]);

  const stats = useMemo(() => {
    const by = (fn: (o: DemoOrder) => boolean) => DEMO_ORDERS.filter(fn).length;
    return {
      total: DEMO_ORDERS.length,
      aguardando: by((o) => o.payStatus === "aguardando"),
      pagos: by((o) => o.payStatus === "pago"),
      preparacao: by((o) => o.stage === "preparacao"),
      enviados: by((o) => o.stage === "enviado"),
      entregues: by((o) => o.stage === "entregue"),
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Pedidos — Prévia"
        description="Protótipo do novo sistema de gerenciamento de pedidos. Nenhum dado real é usado ou alterado."
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
          <Clock className="size-4" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-black uppercase tracking-wide text-amber-700">Modo demonstração</p>
          <p className="mt-0.5 text-amber-700/90">
            Todos os pedidos, clientes, valores e rastreios desta página são fictícios. Nenhuma
            cobrança PIX é gerada e nenhuma mensagem de WhatsApp é enviada.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total de pedidos" value={String(stats.total)} icon={<ShoppingCart className="size-5" />} tone="brand" hint="Demonstração" />
        <StatCard label="Aguardando pagamento" value={String(stats.aguardando)} icon={<Clock className="size-5" />} tone="warning" hint="PIX pendente" />
        <StatCard label="Pagamentos confirmados" value={String(stats.pagos)} icon={<CheckCircle2 className="size-5" />} hint="PIX aprovado" />
        <StatCard label="Em preparação" value={String(stats.preparacao)} icon={<Package className="size-5" />} />
        <StatCard label="Enviados" value={String(stats.enviados)} icon={<Truck className="size-5" />} />
        <StatCard label="Entregues" value={String(stats.entregues)} icon={<PackageCheck className="size-5" />} />
      </div>

      <AdminCard className="mt-6 p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por número do pedido, cliente ou telefone"
              className="pl-9"
            />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
                  filter === f.key
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:-translate-y-px hover:bg-secondary hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </AdminCard>

      <AdminCard className="mt-4 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="size-5" />}
            title="Nenhum pedido encontrado"
            description="Ajuste os filtros ou a busca para ver os pedidos de demonstração."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Pedido</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3">Status pagamento</th>
                    <th className="px-4 py-3">Status pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr
                      key={o.code}
                      onClick={() => setSelected(o)}
                      className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-black">{o.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{o.customer}</p>
                        <p className="text-xs text-muted-foreground">{o.whatsapp}</p>
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums">{formatBRL(o.total)}</td>
                      <td className="px-4 py-3 font-semibold">{o.payment}</td>
                      <td className="px-4 py-3">
                        <PayPill status={o.payStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <StagePill stage={o.stage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-border md:hidden">
              {rows.map((o) => (
                <button
                  key={o.code}
                  onClick={() => setSelected(o)}
                  className="grid w-full gap-2 p-4 text-left transition-colors active:bg-secondary/50"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-black">{o.code}</span>
                    <span className="font-bold tabular-nums">{formatBRL(o.total)}</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold">{o.customer}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.whatsapp} • {o.payment}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <PayPill status={o.payStatus} />
                    <StagePill stage={o.stage} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </AdminCard>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-md">
          {selected && (
            <OrderDetail order={selected} onWhatsApp={(a) => setWaDialog(a)} />
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!waDialog} onOpenChange={(v) => !v && setWaDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{waDialog}</DialogTitle>
            <DialogDescription>
              Função disponível após a integração oficial com WhatsApp.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------------- components --------------------------------- */

function PayPill({ status }: { status: PayStatus }) {
  const m = PAY_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold",
        m.tone,
      )}
    >
      <span className={cn("size-2 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

function StagePill({ stage }: { stage: OrderStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
        STAGE_TONE[stage],
      )}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function OrderDetail({
  order,
  onWhatsApp,
}: {
  order: DemoOrder;
  onWhatsApp: (action: string) => void;
}) {
  const reached = timelineIndex(order);

  return (
    <div>
      <div className="border-b border-border bg-secondary/40 px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Demonstração</p>
        <h2 className="mt-1 text-xl font-black">{order.code}</h2>
        <p className="text-xs text-muted-foreground">
          {new Date(order.createdAt).toLocaleString("pt-BR")}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <PayPill status={order.payStatus} />
          <StagePill stage={order.stage} />
        </div>
      </div>

      <div className="grid gap-5 p-5">
        <div className="grid gap-3 rounded-2xl border border-border p-4">
          <Field label="Cliente" value={order.customer} />
          <Field label="WhatsApp" value={order.whatsapp} />
          <Field label="Endereço" value={order.address} />
        </div>

        <div className="rounded-2xl border border-border p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Produtos
          </p>
          <ul className="mt-2 grid gap-2">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm">
                <span>
                  <span className="font-semibold">{it.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    Tamanho {it.size} • Quantidade {it.qty}
                  </span>
                </span>
                <span className="font-bold tabular-nums">{formatBRL(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-bold">Total ({order.payment})</span>
            <span className="text-lg font-black tabular-nums">{formatBRL(order.total)}</span>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border p-4">
          <Field label="Rastreamento" value={order.tracking} />
        </div>

        <div className="rounded-2xl border border-border p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Timeline
          </p>
          <ol className="mt-3 grid gap-0">
            {TIMELINE.map((step, i) => {
              const done = i <= reached && order.stage !== "cancelado";
              const isLast = i === TIMELINE.length - 1;
              return (
                <li key={step.label} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <div className="grid justify-items-center">
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full border text-[10px] font-black",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    {!isLast && (
                      <span
                        className={cn("my-1 w-px flex-1", done ? "bg-primary/40" : "bg-border")}
                      />
                    )}
                  </div>
                  <div className={cn("pb-4", isLast && "pb-0")}>
                    <p className={cn("text-sm font-bold", !done && "text-muted-foreground")}>
                      {step.label}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {order.stage === "cancelado" && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-destructive">
              <XCircle className="size-3.5" /> Pedido cancelado (demonstração)
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            WhatsApp (prévia)
          </p>
          {[
            { label: "Falar com cliente", icon: MessageCircle },
            { label: "Enviar atualização", icon: Send },
            { label: "Pedido enviado", icon: Truck },
          ].map((b) => (
            <button
              key={b.label}
              onClick={() => onWhatsApp(b.label)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-px hover:bg-secondary"
            >
              <b.icon className="size-4" /> {b.label}
            </button>
          ))}
          <p className="text-xs text-muted-foreground">
            Nenhuma mensagem é enviada nesta prévia.
          </p>
        </div>
      </div>
    </div>
  );
}
