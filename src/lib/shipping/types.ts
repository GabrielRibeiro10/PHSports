import type { CategoryId } from "@/lib/products";

/** Item do carrinho como o servidor precisa para cotar (preço e medidas vêm do banco). */
export type QuoteItem = { slug: string; qty: number };

export type ShippingEnvironment = "sandbox" | "production";

export type ShippingOption = {
  /** "<provedor>:<id do serviço>" — estável para reconhecer a escolha na finalização */
  key: string;
  name: string;
  carrier: string;
  price: number;
  /** prazo de transporte informado pelo provedor, em dias úteis */
  days: { min: number; max: number };
};

export type QuoteErrorCode =
  | "invalid_cep"
  | "cep_not_found"
  | "no_service"
  | "package_config"
  | "too_big"
  | "empty_cart"
  | "provider_config"
  | "provider_error"
  | "rate_limited";

export type QuoteResult =
  | {
      ok: true;
      cep: string;
      city?: string;
      uf?: string;
      options: ShippingOption[];
      /** dias úteis para separar e postar o pedido (configurado pela loja) */
      prepDays: number;
      environment: ShippingEnvironment;
      /** identifica exatamente o carrinho cotado (itens + quantidades + CEP) */
      signature: string;
    }
  | { ok: false; code: QuoteErrorCode; message: string };

/** Configuração da loja (store_settings, chave "shipping"). Sem segredos aqui. */
export type ShippingSettings = {
  origin_cep: string;
  prep_days: number;
  box: { length_cm: number; width_cm: number; base_height_cm: number; empty_weight_g: number };
  items: Partial<Record<CategoryId, { weight_g: number; thickness_cm: number }>>;
};

export const QUOTE_MESSAGES: Record<QuoteErrorCode, string> = {
  invalid_cep: "CEP inválido. Confira os 8 números e tente de novo.",
  cep_not_found: "Não encontramos esse CEP. Confira os números e tente de novo.",
  no_service: "Os Correios não atendem esse CEP com as modalidades disponíveis. Fale com a gente no WhatsApp.",
  package_config:
    "O frete ainda não pode ser calculado para estes produtos (faltam peso ou medidas no cadastro da loja). Fale com a gente no WhatsApp.",
  too_big: "Este pedido passa do tamanho ou peso aceito pelos Correios em uma caixa. Fale com a gente no WhatsApp para dividir o envio.",
  empty_cart: "Adicione produtos para calcular o frete.",
  provider_config: "O cálculo de frete está temporariamente indisponível. Tente mais tarde ou fale com a gente no WhatsApp.",
  provider_error: "Não foi possível consultar o frete agora. Tente novamente em instantes.",
  rate_limited: "Muitas consultas seguidas. Aguarde alguns segundos e tente de novo.",
};

/** Assinatura determinística do que foi cotado: muda se CEP, produtos ou quantidades mudarem. */
export function quoteSignature(cep: string, items: QuoteItem[]): string {
  const norm = [...items]
    .filter((i) => i.qty > 0)
    .reduce<Record<string, number>>((acc, i) => ((acc[i.slug] = (acc[i.slug] ?? 0) + i.qty), acc), {});
  const body = Object.keys(norm)
    .sort()
    .map((s) => `${s}*${norm[s]}`)
    .join(",");
  return `${cep}|${body}`;
}
