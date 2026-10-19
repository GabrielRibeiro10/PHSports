import { createServerFn } from "@tanstack/react-start";
import { throttled } from "@/lib/coupons.server";
import { orderInput } from "@/lib/orders.schema";
import type { OrderResult } from "@/lib/orders.server";

/** Finaliza o pedido: valida produtos, cupom e frete no servidor e salva com o endereço. */
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderInput.parse(input))
  .handler(async ({ data }): Promise<OrderResult> => {
    // Balde global (por instância) além do por-WhatsApp: trocar o número a cada pedido não escapa do limite.
    // O limite entre instâncias fica no banco (máx. 10 pedidos pendentes por WhatsApp por hora).
    if (throttled("pedido:*", 120) || throttled(`pedido:${data.customer.whatsapp.replace(/\D/g, "")}`, 8))
      return { ok: false, code: "rate_limited", message: "Muitas tentativas seguidas. Aguarde um minuto e tente de novo." };
    const { createOrderCore, serverOrderDeps } = await import("@/lib/orders.server");
    try {
      return await createOrderCore(data, await serverOrderDeps());
    } catch (e) {
      console.error("[pedido] falha inesperada", e);
      return { ok: false, code: "save_failed", message: "Não conseguimos registrar o pedido agora. Tente de novo em instantes." };
    }
  });
