import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowLeft, Ban, CheckCircle2, Copy, History, Loader2, MessageCircle, Package, PackageCheck, Printer, Send, StickyNote, Truck, Undo2 } from "lucide-react";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, EmptyState, PageHeader, TableSkeleton } from "@/components/admin/AdminUI";
import { Badge } from "@/components/admin/OrderBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL } from "@/lib/products";
import { pickingPage, printDocument, receiptPage } from "@/lib/print";
import {
  addOrderNote,
  cancelOrder,
  confirmPayment,
  customerWhatsappHref,
  FULFILLMENT_LABEL,
  operationSettingsQuery,
  orderDetailQuery,
  PAYMENT_LABEL,
  registerRefund,
  setFulfillment,
  setShipping,
  SHIPPING_LABEL,
  updateTracking,
  type Fulfillment,
  type OrderRow,
  type Payment,
} from "@/lib/adminOrders";

export const Route = createFileRoute("/admin/pedido/$id")({
  head: () => ({ meta: [{ title: "Pedido — Painel PH Sports" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireAdmin>
      <AdminLayout>
        <OrderPage />
      </AdminLayout>
    </RequireAdmin>
  ),
});

const money = (v: unknown) => formatBRL(Number(v ?? 0));
const parseMoney = (s: string) => Number(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
const today = () => new Date().toISOString().slice(0, 10);
const cepFmt = (c: string) => c.replace(/^(\d{5})(\d{3})$/, "$1-$2");

function useAction<T>(fn: (v: T) => Promise<unknown>, success: string, after?: () => void) {
  const qc = useQueryClient();
  const { id } = Route.useParams();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      const already = (r as { already?: boolean } | undefined)?.already;
      toast.success(already ? "Nada mudou: isso já tinha sido feito." : success);
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      qc.invalidateQueries({ queryKey: ["admin-orders-page"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-stock"] });
      after?.();
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

/** Botão que pede confirmação antes de executar (ações que mexem em estoque/estado). */
function ConfirmButton({
  label,
  title,
  description,
  onConfirm,
  pending,
  disabled,
  variant = "default",
  icon,
}: {
  label: string;
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  pending?: boolean;
  disabled?: boolean;
  variant?: "default" | "destructive" | "outline";
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} disabled={disabled || pending} onClick={() => setOpen(true)}>
        {pending ? <Loader2 className="animate-spin" /> : icon} {label}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">{description}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Section({ title, icon, children, className = "" }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <AdminCard className={`p-5 ${className}`}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
        {icon} {title}
      </h2>
      {children}
    </AdminCard>
  );
}

function OrderPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery(orderDetailQuery(id));
  const settings = useQuery(operationSettingsQuery);

  if (isLoading) return <AdminCard><TableSkeleton rows={6} cols={3} /></AdminCard>;
  if (error || !data?.order)
    return (
      <AdminCard>
        <EmptyState
          icon={<Package className="size-5" />}
          title={error ? "Não foi possível carregar o pedido" : "Pedido não encontrado"}
          description={error ? (error as Error).message : undefined}
          action={error ? <Button onClick={() => refetch()}>Tentar de novo</Button> : <Link to="/admin/pedidos" className="text-sm underline">Voltar aos pedidos</Link>}
        />
      </AdminCard>
    );

  const { order: o, items, events } = data;
  const hello = `Olá, ${o.customer_name.split(" ")[0] || ""}! Aqui é da PH Sports, sobre o seu pedido ${o.code}.`;
  const pix = settings.data?.pix_key?.trim();
  const canCharge = Boolean(pix) && o.payment_status === "pendente" && o.fulfillment_status !== "cancelado" && o.shipping_status !== "pendente";
  const chargeText = `${hello}\n\nTotal com frete: ${money(o.total)}.\nChave Pix: ${pix ?? ""}${
    settings.data?.pix_owner ? ` (${settings.data.pix_owner})` : ""
  }\n\nAssim que o pagamento cair, confirmamos por aqui e separamos o seu pedido.`;
  return (
    <div>
      <Link to="/admin/pedidos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Pedidos
      </Link>
      <PageHeader
        title={`Pedido ${o.code}`}
        description={`Criado em ${new Date(o.created_at).toLocaleString("pt-BR")}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { try { printDocument(`Pedido ${o.code}`, pickingPage(o, items) + receiptPage(o, items)); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível imprimir."); } }}>
              <Printer /> Imprimir separação e recibo
            </Button>
            {canCharge && (
              <Button asChild variant="outline">
                <a href={customerWhatsappHref(o.customer_whatsapp, chargeText)} target="_blank" rel="noopener noreferrer">
                  Enviar dados do Pix
                </a>
              </Button>
            )}
            <Button asChild>
              <a href={customerWhatsappHref(o.customer_whatsapp, hello)} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Conversar no WhatsApp
              </a>
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge status={o.payment_status} label={`Pagamento ${PAYMENT_LABEL[o.payment_status as Payment].toLowerCase()}`} />
        <Badge status={o.fulfillment_status} label={FULFILLMENT_LABEL[o.fulfillment_status as Fulfillment]} />
        {o.shipping_status === "pendente" && <Badge status="pendente" label="Frete pendente" />}
        {o.shipping_environment === "sandbox" && <Badge status="reembolsado" label="Frete de teste (sandbox)" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-4">
          <Section title="Produtos" icon={<Package className="size-4" />}>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2">Produto</th>
                  <th className="pb-2">Tam.</th>
                  <th className="pb-2 text-right">Qtd.</th>
                  <th className="pb-2 text-right">Preço</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="py-2 pr-2 font-medium">{it.product_name}</td>
                    <td className="py-2">{it.size}</td>
                    <td className="py-2 text-right tabular-nums">{it.quantity}</td>
                    <td className="py-2 text-right tabular-nums">{money(it.unit_price)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{money(Number(it.unit_price) * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-muted-foreground">Preços do momento da compra (não mudam se o produto for reajustado).</p>
            <dl className="mt-4 grid gap-1.5 border-t border-border pt-3 text-sm">
              <Row label="Produtos" value={money(o.subtotal)} />
              {Number(o.discount) > 0 && <Row label={`Desconto${o.coupon_code ? ` (${o.coupon_code})` : ""}`} value={`-${money(o.discount)}`} />}
              <Row
                label={`Frete${o.shipping_service ? ` · ${o.shipping_service}` : ""}`}
                value={o.shipping_status === "pendente" ? <span className="font-semibold text-amber-700">pendente</span> : money(o.shipping)}
              />
              <Row label={o.shipping_status === "pendente" ? "Total (sem frete)" : "Total"} value={<span className="text-lg font-black">{money(o.total)}</span>} />
            </dl>
          </Section>

          <PaymentSection o={o} />
          <FulfillmentSection o={o} />
          <NotesSection orderId={o.id} notes={events.filter((e) => e.kind === "nota")} />
        </div>

        <div className="grid content-start gap-4">
          <Section title="Cliente" icon={<MessageCircle className="size-4" />}>
            <p className="font-semibold">{o.customer_name}</p>
            <a className="text-sm underline" href={customerWhatsappHref(o.customer_whatsapp, hello)} target="_blank" rel="noopener noreferrer">
              {o.customer_whatsapp}
            </a>
          </Section>
          <AddressSection o={o} />
          <ShippingSection o={o} />
          <Section title="Histórico" icon={<History className="size-4" />}>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem registros.</p>
            ) : (
              <ol className="grid gap-3">
                {events.map((e) => (
                  <li key={e.id} className="border-l-2 border-border pl-3 text-sm">
                    <p>{e.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                      {e.actor_email ? ` · ${e.actor_email}` : e.kind === "criado" ? " · site" : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function PaymentSection({ o }: { o: OrderRow }) {
  const [amount, setAmount] = useState(Number(o.total).toFixed(2).replace(".", ","));
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState(Number(o.payment_confirmed_amount ?? o.total).toFixed(2).replace(".", ","));
  const [refundNote, setRefundNote] = useState("");
  // O total muda quando o frete é registrado: o valor sugerido acompanha.
  useEffect(() => {
    setAmount(Number(o.total).toFixed(2).replace(".", ","));
  }, [o.total]);
  useEffect(() => {
    setRefund(Number(o.payment_confirmed_amount ?? o.total).toFixed(2).replace(".", ","));
  }, [o.payment_confirmed_amount, o.total]);
  const confirm = useAction(() => confirmPayment(o.id, parseMoney(amount), note), "Pagamento confirmado e estoque baixado.");
  const refundM = useAction(() => registerRefund(o.id, parseMoney(refund), refundNote), "Reembolso registrado.");
  const cancelled = o.fulfillment_status === "cancelado";
  // A caixa Frete fica na outra coluna (no celular, bem mais abaixo): leva até ela e já foca o valor.
  const goToShipping = () => {
    const input = document.getElementById("s-value");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  };

  return (
    <Section title="Pagamento" icon={<CheckCircle2 className="size-4" />}>
      {o.payment_status === "pendente" ? (
        cancelled ? (
          <p className="text-sm text-muted-foreground">Pedido cancelado: pagamento não pode ser confirmado.</p>
        ) : o.shipping_status === "pendente" ? (
          <div className="grid gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3">
            <p className="text-sm text-amber-800">
              Falta registrar o frete. O botão “Confirmar pagamento” aparece assim que o frete for salvo (frete grátis: registre 0,00).
            </p>
            <div>
              <Button type="button" variant="outline" onClick={goToShipping}>
                <Truck /> Registrar frete
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Confirme só depois de ver o dinheiro na conta. Abrir o WhatsApp ou receber comprovante não confirma pagamento.
            </p>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <div className="grid gap-1.5">
                <Label htmlFor="pay-amount">Valor recebido (R$)</Label>
                <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pay-note">Observação (ex.: Pix, banco)</Label>
                <Input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
              </div>
            </div>
            <div>
              <ConfirmButton
                label="Confirmar pagamento"
                icon={<CheckCircle2 />}
                pending={confirm.isPending}
                title={`Confirmar pagamento de ${money(parseMoney(amount))}?`}
                description={
                  <>
                    <p>O estoque dos produtos deste pedido será baixado agora (uma única vez).</p>
                    <p>Se faltar estoque em algum tamanho, a confirmação é bloqueada e nada é alterado.</p>
                  </>
                }
                onConfirm={() => confirm.mutate(undefined)}
              />
            </div>
          </div>
        )
      ) : (
        <div className="grid gap-3 text-sm">
          <dl className="grid gap-1.5">
            <Row label="Situação" value={PAYMENT_LABEL[o.payment_status as Payment]} />
            <Row label="Valor confirmado" value={money(o.payment_confirmed_amount)} />
            <Row label="Confirmado em" value={o.payment_confirmed_at ? new Date(o.payment_confirmed_at).toLocaleString("pt-BR") : "—"} />
            <Row label="Por" value={o.payment_confirmed_by_email ?? "—"} />
            {o.payment_status === "reembolsado" && (
              <>
                <Row label="Reembolso" value={money(o.refund_amount)} />
                <Row label="Registrado em" value={o.refunded_at ? new Date(o.refunded_at).toLocaleString("pt-BR") : "—"} />
              </>
            )}
          </dl>
          {o.payment_status === "confirmado" && (
            <div className="grid gap-3 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Registrar reembolso só anota que você devolveu o dinheiro (o sistema não movimenta dinheiro). Não mexe no estoque.
              </p>
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <div className="grid gap-1.5">
                  <Label htmlFor="ref-amount">Valor devolvido (R$)</Label>
                  <Input id="ref-amount" inputMode="decimal" value={refund} onChange={(e) => setRefund(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ref-note">Como foi devolvido</Label>
                  <Input id="ref-note" value={refundNote} onChange={(e) => setRefundNote(e.target.value)} maxLength={200} />
                </div>
              </div>
              <div>
                <ConfirmButton
                  variant="outline"
                  label="Registrar reembolso"
                  icon={<Undo2 />}
                  pending={refundM.isPending}
                  title="Registrar reembolso?"
                  description={<p>O pagamento passa para “Reembolsado” e sai das vendas. Isso não pode ser desfeito.</p>}
                  onConfirm={() => refundM.mutate(undefined)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function FulfillmentSection({ o }: { o: OrderRow }) {
  const [carrier, setCarrier] = useState(o.tracking_carrier || o.shipping_carrier || "Correios");
  const [tracking, setTracking] = useState(o.tracking_code);
  const [posted, setPosted] = useState(o.posted_at ?? today());
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const prep = useAction(() => setFulfillment(o.id, "em_preparacao"), "Pedido em preparação.");
  const ship = useAction(() => setFulfillment(o.id, "enviado", { carrier, tracking, postedAt: posted }), "Pedido marcado como enviado.");
  const deliver = useAction(() => setFulfillment(o.id, "entregue"), "Pedido marcado como entregue.");
  const track = useAction(() => updateTracking(o.id, carrier, tracking, posted), "Rastreio atualizado.");
  const cancel = useAction(() => cancelOrder(o.id, reason, restock), "Pedido cancelado.");
  const st = o.fulfillment_status as Fulfillment;
  const paid = o.payment_status === "confirmado";

  const trackingFields = (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="grid gap-1.5">
        <Label htmlFor="t-carrier">Transportadora</Label>
        <Input id="t-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} maxLength={60} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="t-code">Código de rastreio</Label>
        <Input id="t-code" value={tracking} onChange={(e) => setTracking(e.target.value.toUpperCase())} maxLength={40} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="t-date">Data de postagem</Label>
        <Input id="t-date" type="date" value={posted} onChange={(e) => setPosted(e.target.value)} />
      </div>
    </div>
  );

  return (
    <Section title="Atendimento e entrega" icon={<Truck className="size-4" />}>
      <p className="mb-3 text-sm">
        Situação: <strong>{FULFILLMENT_LABEL[st]}</strong>
        {o.cancel_reason ? <span className="text-muted-foreground"> — {o.cancel_reason}</span> : null}
      </p>

      {st === "aguardando_atendimento" && (
        <div className="grid gap-2">
          {!paid && <p className="text-sm text-muted-foreground">A preparação começa depois do pagamento confirmado.</p>}
          <div>
            <Button disabled={!paid || prep.isPending} onClick={() => prep.mutate(undefined)}>
              {prep.isPending ? <Loader2 className="animate-spin" /> : <Package />} Iniciar preparação
            </Button>
          </div>
        </div>
      )}

      {st === "em_preparacao" && (
        <div className="grid gap-3">
          {trackingFields}
          <div>
            <ConfirmButton
              label="Marcar como enviado"
              icon={<Send />}
              pending={ship.isPending}
              disabled={!carrier.trim()}
              title="Marcar como enviado?"
              description={<p>Transportadora: {carrier || "—"} · rastreio: {tracking || "sem código"} · postagem: {posted}</p>}
              onConfirm={() => ship.mutate(undefined)}
            />
          </div>
        </div>
      )}

      {(st === "enviado" || st === "entregue") && (
        <div className="grid gap-3">
          {trackingFields}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={track.isPending || !carrier.trim()} onClick={() => track.mutate(undefined)}>
              {track.isPending ? <Loader2 className="animate-spin" /> : null} Salvar rastreio
            </Button>
            {st === "enviado" && (
              <ConfirmButton
                label="Marcar como entregue"
                icon={<PackageCheck />}
                pending={deliver.isPending}
                title="Confirmar entrega?"
                description={<p>O pedido passa para “Entregue”.</p>}
                onConfirm={() => deliver.mutate(undefined)}
              />
            )}
          </div>
        </div>
      )}

      {(st === "aguardando_atendimento" || st === "em_preparacao") && (
        <div className="mt-5 grid gap-2 border-t border-border pt-4">
          <Label htmlFor="c-reason">Cancelar pedido</Label>
          <Input id="c-reason" placeholder="Motivo (obrigatório)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
          {o.stock_deducted_at && !o.stock_restored_at && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={restock} onCheckedChange={(v) => setRestock(v === true)} /> Devolver os produtos ao estoque
            </label>
          )}
          <div>
            <ConfirmButton
              variant="destructive"
              label="Cancelar pedido"
              icon={<Ban />}
              pending={cancel.isPending}
              disabled={!reason.trim()}
              title={`Cancelar o pedido ${o.code}?`}
              description={
                <>
                  <p>O pedido fica cancelado e não pode voltar.</p>
                  {o.stock_deducted_at ? (
                    <p>{restock ? "O estoque baixado será devolvido (uma única vez)." : "O estoque NÃO será devolvido."}</p>
                  ) : (
                    <p>O estoque não tinha sido baixado: nada muda no estoque.</p>
                  )}
                  {paid && <p>O pagamento continua “Confirmado”. Se devolver o dinheiro, registre o reembolso.</p>}
                </>
              }
              onConfirm={() => cancel.mutate(undefined)}
            />
          </div>
        </div>
      )}
    </Section>
  );
}

function AddressSection({ o }: { o: OrderRow }) {
  const text = [
    o.customer_name,
    `${o.ship_street}, ${o.ship_number}${o.ship_complement ? ` - ${o.ship_complement}` : ""}`,
    `${o.ship_district} - ${o.ship_city}/${o.ship_uf}`,
    `CEP ${cepFmt(o.ship_cep)}`,
  ].join("\n");
  const has = Boolean(o.ship_street || o.ship_cep);
  return (
    <Section title="Endereço de entrega" icon={<Truck className="size-4" />}>
      {has ? (
        <>
          <p className="whitespace-pre-line text-sm">{text}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() =>
              navigator.clipboard.writeText(text).then(
                () => toast.success("Endereço copiado"),
                () => toast.error("Não foi possível copiar"),
              )
            }
          >
            <Copy /> Copiar endereço
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Pedido antigo, sem endereço registrado.</p>
      )}
    </Section>
  );
}

function ShippingSection({ o }: { o: OrderRow }) {
  const [value, setValue] = useState(o.shipping_status === "pendente" ? "" : Number(o.shipping).toFixed(2).replace(".", ","));
  const [service, setService] = useState(o.shipping_service || "Correios PAC");
  const [days, setDays] = useState("");
  const save = useAction(() => setShipping(o.id, parseMoney(value), service, days), "Frete registrado e total atualizado.");
  const editable = o.payment_status === "pendente" && o.fulfillment_status !== "cancelado";
  const prazo =
    o.shipping_days_max != null
      ? `${o.shipping_days_min === o.shipping_days_max ? o.shipping_days_max : `${o.shipping_days_min} a ${o.shipping_days_max}`} dias úteis`
      : "";
  return (
    <Section title="Frete" icon={<Truck className="size-4" />}>
      <dl className="grid gap-1.5 text-sm">
        <Row label="Situação" value={SHIPPING_LABEL[o.shipping_status] ?? o.shipping_status} />
        {o.shipping_status !== "pendente" && <Row label="Modalidade" value={o.shipping_service || "—"} />}
        {o.shipping_status !== "pendente" && <Row label="Valor" value={money(o.shipping)} />}
        {prazo && <Row label="Prazo informado" value={`${prazo}${o.shipping_prep_days ? ` + ${o.shipping_prep_days} prep.` : ""}`} />}
      </dl>
      {editable && (
        <form
          className="mt-4 grid gap-3 border-t border-border pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          <p className="text-xs text-muted-foreground">
            {o.shipping_status === "pendente" ? "Combine o frete com o cliente e registre aqui. O total é atualizado." : "Corrigir frete antes do pagamento."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="s-value">Valor (R$)</Label>
              <Input id="s-value" inputMode="decimal" required placeholder="0,00" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-days">Prazo (dias úteis)</Label>
              <Input id="s-days" placeholder="ex.: 5 a 8" value={days} onChange={(e) => setDays(e.target.value)} maxLength={20} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-service">Modalidade / transportadora</Label>
            <Input id="s-service" required value={service} onChange={(e) => setService(e.target.value)} maxLength={60} />
          </div>
          <div>
            <Button type="submit" variant="outline" disabled={save.isPending || value.trim() === ""}>
              {save.isPending ? <Loader2 className="animate-spin" /> : null} Salvar frete
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Frete grátis: registre 0,00 de propósito. Frete vazio continua “pendente”.</p>
        </form>
      )}
      <p className="mt-4 text-[11px] text-muted-foreground">Etiqueta automática: indisponível (não há integração de etiquetas configurada).</p>
    </Section>
  );
}

function NotesSection({ orderId, notes }: { orderId: string; notes: { id: string; message: string; created_at: string; actor_email: string | null }[] }) {
  const [text, setText] = useState("");
  const add = useAction(() => addOrderNote(orderId, text), "Observação salva.", () => setText(""));
  return (
    <Section title="Observações internas" icon={<StickyNote className="size-4" />}>
      <p className="mb-2 text-xs text-muted-foreground">Visíveis só no painel. O comprador não vê.</p>
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate(undefined);
        }}
      >
        <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} placeholder="Ex.: cliente pediu para entregar depois das 18h" />
        <div>
          <Button type="submit" variant="outline" disabled={!text.trim() || add.isPending}>
            {add.isPending ? <Loader2 className="animate-spin" /> : null} Adicionar observação
          </Button>
        </div>
      </form>
      {notes.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-secondary/50 px-3 py-2 text-sm">
              <p className="whitespace-pre-line">{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString("pt-BR")}
                {n.actor_email ? ` · ${n.actor_email}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
