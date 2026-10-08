import { describe, expect, it } from "vitest";
import type { OrderItemRow, OrderRow } from "@/lib/adminOrders";
import { escapeHtml, pickingPage, receiptPage } from "./print";

const order = {
  code: "PH-1", created_at: "2026-10-08T12:00:00Z", customer_name: '<img src=x onerror=alert(1)>', customer_whatsapp: "11999999999",
  ship_street: "Rua A", ship_number: "10", ship_complement: "", ship_district: "Centro", ship_city: "Ilhabela", ship_uf: "SP", ship_cep: "11630-000",
  subtotal: 200, discount: 20, shipping: 0, shipping_status: "pendente", shipping_service: "", total: 180, coupon_code: "OFF10",
  payment_status: "pendente", payment_method: "pix", payment_confirmed_at: null, tracking_code: "", tracking_carrier: "", notes: "<b>x</b>",
} as unknown as OrderRow;
const items = [{ product_name: "Camisa <Flamengo>", size: "G", quantity: 2, unit_price: 100 }] as unknown as OrderItemRow[];

describe("impressão", () => {
  it("escapa HTML", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });
  it("nunca deixa HTML do cliente ou do produto passar na lista e no recibo", () => {
    for (const html of [pickingPage(order, items), receiptPage(order, items)]) {
      expect(html).not.toContain("<img");
      expect(html).not.toContain("<Flamengo>");
      expect(html).toContain("&lt;img");
    }
  });
  it("lista de separação mostra quantidade, tamanho e total de peças", () => {
    const html = pickingPage(order, items);
    expect(html).toContain("<b>2</b>");
    expect(html).toContain("2 peças");
    expect(html).toContain(">G<");
  });
  it("recibo mostra desconto, frete a combinar e pagamento pendente", () => {
    const html = receiptPage(order, items);
    expect(html).toContain("OFF10");
    expect(html).toContain("A combinar");
    expect(html).toContain("Pagamento pendente");
  });
});
