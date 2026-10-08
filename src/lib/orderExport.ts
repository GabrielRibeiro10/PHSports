import { toCsv, type CsvColumn } from "@/lib/csv";
import { FULFILLMENT_LABEL, PAYMENT_LABEL, SHIPPING_LABEL, type Fulfillment, type OrderRow, type Payment } from "@/lib/adminOrders";

const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR") : "");
export const ORDER_COLUMNS: CsvColumn<OrderRow>[] = [
  { header: "Pedido", value: (o) => o.code },
  { header: "Data", value: (o) => dt(o.created_at) },
  { header: "Cliente", value: (o) => o.customer_name },
  { header: "WhatsApp", value: (o) => o.customer_whatsapp },
  { header: "Cidade", value: (o) => o.ship_city },
  { header: "UF", value: (o) => o.ship_uf },
  { header: "Produtos (R$)", value: (o) => Number(o.subtotal) },
  { header: "Desconto (R$)", value: (o) => Number(o.discount) },
  { header: "Frete (R$)", value: (o) => (o.shipping_status === "pendente" ? "" : Number(o.shipping)) },
  { header: "Frete", value: (o) => SHIPPING_LABEL[o.shipping_status] ?? o.shipping_status },
  { header: "Total (R$)", value: (o) => Number(o.total) },
  { header: "Cupom", value: (o) => o.coupon_code },
  { header: "Pagamento", value: (o) => PAYMENT_LABEL[o.payment_status as Payment] ?? o.payment_status },
  { header: "Pago em", value: (o) => dt(o.payment_confirmed_at) },
  { header: "Situação", value: (o) => FULFILLMENT_LABEL[o.fulfillment_status as Fulfillment] ?? o.fulfillment_status },
  { header: "Transportadora", value: (o) => o.tracking_carrier },
  { header: "Rastreio", value: (o) => o.tracking_code },
];
export const ordersToCsv = (rows: OrderRow[]) => toCsv(rows, ORDER_COLUMNS);
