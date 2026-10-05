import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { throttled } from "@/lib/coupons.server";
import { QUOTE_MESSAGES, type QuoteResult } from "@/lib/shipping/types";

const quoteInput = z.object({
  cep: z.string().max(12),
  items: z.array(z.object({ slug: z.string().min(1).max(120), qty: z.number().int().min(1).max(50) })).max(40),
});

/** Cotação de frete real (Melhor Envio ou Correios), sempre no servidor. */
export const quoteShipping = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => quoteInput.parse(input))
  .handler(async ({ data }): Promise<QuoteResult> => {
    if (throttled(`frete:${data.cep}`, 30)) return { ok: false, code: "rate_limited", message: QUOTE_MESSAGES.rate_limited };
    const { computeQuote, serverQuoteDeps } = await import("@/lib/shipping/quote.server");
    try {
      return await computeQuote(data, await serverQuoteDeps());
    } catch (e) {
      console.error("[frete] falha inesperada", e);
      return { ok: false, code: "provider_error", message: QUOTE_MESSAGES.provider_error };
    }
  });
