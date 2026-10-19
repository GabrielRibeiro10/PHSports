-- ============================================================================
-- Endurecimento de segurança. NÃO apaga dados. Troca regras por versões mais estritas:
--   1. Pedido: o banco reconfere preço, subtotal e total contra o catálogo (defesa em profundidade),
--      debita o cupom NA MESMA transação do pedido (sem passar do limite de usos) e limita pedidos
--      pendentes por WhatsApp (abuso/spam no painel).
--   2. Registro de auditoria: só admin escreve (antes: qualquer usuário logado).
--   3. Configurações da loja (Pix, frete, operação): só admin lê (antes: leitura pública).
-- Antes de aplicar em produção: faça backup do banco (ver docs/seguranca.md).
-- ============================================================================

-- 1. Criação do pedido ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_checkout_order(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _key text := _payload ->> 'idempotency_key';
  _o jsonb := _payload -> 'order';
  _existing public.orders;
  _cust uuid;
  _id uuid;
  _code text;
  _it jsonb;
  _price numeric;
  _active boolean;
  _qty integer;
  _sub numeric := 0;
  _discount numeric := COALESCE((_o ->> 'discount')::numeric, 0);
  _ship numeric := COALESCE((_o ->> 'shipping')::numeric, 0);
  _coupon text := NULLIF(upper(btrim(COALESCE(_o ->> 'coupon_code', ''))), '');
BEGIN
  IF _key IS NULL OR length(_key) < 16 OR length(_key) > 80 THEN
    RAISE EXCEPTION 'Chave de idempotência inválida.';
  END IF;
  IF jsonb_typeof(_payload -> 'items') <> 'array' OR jsonb_array_length(_payload -> 'items') = 0 THEN
    RAISE EXCEPTION 'Pedido sem itens.';
  END IF;

  -- Mesma chave = mesmo pedido (cliques repetidos / nova tentativa), sem recalcular nem debitar cupom de novo.
  SELECT * INTO _existing FROM public.orders WHERE idempotency_key = _key;
  IF FOUND THEN
    RETURN jsonb_build_object('id', _existing.id, 'code', _existing.code, 'created', false);
  END IF;

  -- Limite de pedidos pendentes por WhatsApp na última hora (vale para todas as instâncias do servidor).
  IF (SELECT count(*) FROM public.orders
       WHERE customer_whatsapp = _o ->> 'customer_whatsapp'
         AND created_at > now() - interval '1 hour'
         AND payment_status = 'pendente' AND fulfillment_status = 'aguardando_atendimento') >= 10 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  -- Reconferência: preços e total precisam bater com o catálogo (o servidor já calculou, o banco confere).
  FOR _it IN SELECT value FROM jsonb_array_elements(_payload -> 'items') LOOP
    _qty := (_it ->> 'quantity')::int;
    IF _qty IS NULL OR _qty < 1 OR _qty > 50 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    SELECT price, active INTO _price, _active FROM public.products WHERE id = (_it ->> 'product_id')::uuid;
    IF NOT FOUND OR NOT _active THEN RAISE EXCEPTION 'Produto indisponível.'; END IF;
    IF abs(_price - (_it ->> 'unit_price')::numeric) >= 0.01 THEN RAISE EXCEPTION 'Preço do item diferente do catálogo.'; END IF;
    _sub := _sub + _price * _qty;
  END LOOP;
  _sub := round(_sub, 2);
  IF abs(_sub - (_o ->> 'subtotal')::numeric) >= 0.01 THEN RAISE EXCEPTION 'Subtotal diferente do catálogo.'; END IF;
  IF _discount < 0 OR _discount > _sub THEN RAISE EXCEPTION 'Desconto inválido.'; END IF;
  IF _discount > 0 AND _coupon IS NULL THEN RAISE EXCEPTION 'Desconto sem cupom.'; END IF;
  IF _ship < 0 OR _ship > 10000 THEN RAISE EXCEPTION 'Frete inválido.'; END IF;
  IF abs(round(GREATEST(_sub - _discount, 0) + _ship, 2) - (_o ->> 'total')::numeric) >= 0.01 THEN
    RAISE EXCEPTION 'Total diferente do calculado.';
  END IF;

  SELECT id INTO _cust FROM public.customers WHERE whatsapp = _o ->> 'customer_whatsapp' ORDER BY created_at LIMIT 1;
  IF _cust IS NULL THEN
    INSERT INTO public.customers (name, whatsapp) VALUES (_o ->> 'customer_name', _o ->> 'customer_whatsapp') RETURNING id INTO _cust;
  END IF;

  INSERT INTO public.orders (
    customer_id, customer_name, customer_whatsapp, status, payment_method,
    subtotal, discount, coupon_code, shipping, total, shipping_status,
    shipping_service, shipping_service_key, shipping_carrier, shipping_days_min, shipping_days_max,
    shipping_prep_days, shipping_environment, shipping_quoted_at,
    ship_cep, ship_street, ship_number, ship_complement, ship_district, ship_city, ship_uf,
    notes, idempotency_key
  ) VALUES (
    _cust, _o ->> 'customer_name', _o ->> 'customer_whatsapp', 'pendente', COALESCE(_o ->> 'payment_method', 'pix'),
    _sub, _discount, _coupon,
    _ship, (_o ->> 'total')::numeric, COALESCE(_o ->> 'shipping_status', 'pendente'),
    COALESCE(_o ->> 'shipping_service', ''), COALESCE(_o ->> 'shipping_service_key', ''), COALESCE(_o ->> 'shipping_carrier', ''),
    (_o ->> 'shipping_days_min')::int, (_o ->> 'shipping_days_max')::int, COALESCE((_o ->> 'shipping_prep_days')::int, 0),
    COALESCE(_o ->> 'shipping_environment', ''), (_o ->> 'shipping_quoted_at')::timestamptz,
    COALESCE(_o ->> 'ship_cep', ''), COALESCE(_o ->> 'ship_street', ''), COALESCE(_o ->> 'ship_number', ''),
    COALESCE(_o ->> 'ship_complement', ''), COALESCE(_o ->> 'ship_district', ''), COALESCE(_o ->> 'ship_city', ''),
    COALESCE(_o ->> 'ship_uf', ''), NULLIF(_o ->> 'notes', ''), _key
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id, code INTO _id, _code;

  IF _id IS NULL THEN -- outra requisição com a mesma chave ganhou a corrida
    SELECT id, code INTO _id, _code FROM public.orders WHERE idempotency_key = _key;
    RETURN jsonb_build_object('id', _id, 'code', _code, 'created', false);
  END IF;

  INSERT INTO public.order_items (order_id, product_id, product_name, size, quantity, unit_price)
  SELECT _id, (i ->> 'product_id')::uuid, i ->> 'product_name', i ->> 'size', (i ->> 'quantity')::int, (i ->> 'unit_price')::numeric
    FROM jsonb_array_elements(_payload -> 'items') AS i;

  -- Cupom: um único UPDATE condicional (atômico). Se o limite acabou entre a validação e agora,
  -- a função inteira falha e o pedido NÃO é criado (nada de desconto com cupom esgotado).
  IF _coupon IS NOT NULL THEN
    UPDATE public.coupons SET used_count = used_count + 1
     WHERE upper(code) = _coupon
       AND active = true
       AND (starts_at IS NULL OR starts_at <= current_date)
       AND (expires_at IS NULL OR expires_at >= current_date)
       AND (max_uses = 0 OR used_count < max_uses);
    IF NOT FOUND THEN RAISE EXCEPTION 'coupon_unavailable'; END IF;
  END IF;

  INSERT INTO public.order_events (order_id, kind, message, data)
  VALUES (_id, 'criado', 'Pedido criado pelo site (finalização pelo WhatsApp).',
          jsonb_build_object('total', _o ->> 'total', 'shipping_status', COALESCE(_o ->> 'shipping_status', 'pendente')));

  RETURN jsonb_build_object('id', _id, 'code', _code, 'created', true);
END $$;

REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb) TO service_role;

-- 2. Auditoria: ninguém forja ações de admin ---------------------------------------------
-- Admin registra qualquer ação (sempre como ele mesmo). Usuário comum só registra a própria
-- tentativa de login/logout (para você ver quem tentou entrar no painel), nunca ações administrativas.
DROP POLICY IF EXISTS "Authenticated users can insert their own audit events" ON public.audit_log;
DROP POLICY IF EXISTS audit_log_admin_insert ON public.audit_log;
CREATE POLICY audit_log_admin_insert ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR action IN ('admin.login.success', 'admin.login.failure', 'admin.logout'))
  );

-- 3. Configurações da loja: só admin lê (o site lê pelo servidor, com service_role) ----------
DROP POLICY IF EXISTS settings_public_select ON public.store_settings;
DROP POLICY IF EXISTS settings_admin_select ON public.store_settings;
CREATE POLICY settings_admin_select ON public.store_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.store_settings FROM anon;

-- 4. Índices (a regra de limite por WhatsApp e as buscas de pedido filtram por estas colunas) -----
CREATE INDEX IF NOT EXISTS orders_whatsapp_created_idx ON public.orders (customer_whatsapp, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS customers_whatsapp_idx ON public.customers (whatsapp);
