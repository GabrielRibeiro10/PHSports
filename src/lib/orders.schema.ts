import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

export const orderInput = z.object({
  items: z
    .array(z.object({ slug: z.string().min(1).max(120), size: text(20), qty: z.number().int().min(1).max(50) }))
    .min(1)
    .max(40),
  /** identifica a tentativa de compra: repetir o envio devolve o mesmo pedido (sem duplicar) */
  requestId: z.string().min(16).max(80).regex(/^[\w-]+$/),
  /** null = frete a combinar pelo WhatsApp (fica pendente; nunca é tratado como grátis) */
  shipping: z
    .object({ cep: z.string().max(12), key: z.string().min(1).max(60), price: z.number().finite().min(0).max(10_000) })
    .nullable(),
  customer: z.object({
    name: text(120).min(2),
    whatsapp: text(30).refine((v) => /^\d{10,11}$/.test(v.replace(/\D/g, "")), "WhatsApp com DDD inválido"),
  }),
  address: z.object({
    cep: z.string().max(12),
    street: text(160).min(2),
    number: text(20).min(1),
    complement: text(80).optional().default(""),
    district: text(80).min(1),
    city: text(80).min(2),
    uf: z.string().trim().length(2),
  }),
  coupon: z.string().max(40).optional(),
});
export type OrderInput = z.infer<typeof orderInput>;

