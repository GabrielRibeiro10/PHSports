import { describe, expect, it } from "vitest";
import { ordersToCsv } from "./orderExport";
import type { OrderRow } from "@/lib/adminOrders";

describe("ordersToCsv", () => {
  it("gera cabeçalho, valores em reais e protege nome contra fórmula", () => {
    const o = { code: "PH-9", created_at: "2026-10-08T12:00:00Z", customer_name: "=HYPERLINK(\"x\")", customer_whatsapp: "+5511999999999", subtotal: 100.5, discount: 0, shipping: 0, shipping_status: "pendente", total: 100.5, payment_status: "pendente", fulfillment_status: "aguardando_atendimento", payment_confirmed_at: null } as unknown as OrderRow;
    const lines = ordersToCsv([o]).split("\r\n");
    expect(lines[0]).toContain("Pedido;Data;Cliente");
    expect(lines[1]).toContain("PH-9");
    expect(lines[1]).toContain("100,5");
    expect(lines[1]).toContain("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(lines[1]).toContain("'+5511999999999");
    expect(lines[1]).toContain(";Pendente;");
  });
});
