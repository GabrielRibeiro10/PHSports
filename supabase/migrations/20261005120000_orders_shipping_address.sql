-- Frete real (Correios via Melhor Envio ou contrato) + endereço de entrega no pedido.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS shipping_service text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipping_service_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipping_carrier text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipping_days_min integer,
  ADD COLUMN IF NOT EXISTS shipping_days_max integer,
  ADD COLUMN IF NOT EXISTS shipping_prep_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_environment text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipping_quoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ship_cep text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ship_street text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ship_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ship_complement text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ship_district text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ship_city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ship_uf text NOT NULL DEFAULT '';

-- Configuração de frete (sem segredos): CEP de origem, caixa, peso/espessura por categoria, preparação.
-- Valores ficam em branco de propósito: o cálculo só funciona depois que a loja preencher no painel.
INSERT INTO public.store_settings (key, value)
VALUES ('shipping', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;
