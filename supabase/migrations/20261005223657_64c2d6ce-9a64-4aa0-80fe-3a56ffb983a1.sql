-- ============================================================================
-- Painel operacional: pedidos do WhatsApp, pagamento x atendimento, histórico,
-- estoque por tamanho e resumo real. NÃO apaga dados: só adiciona colunas/tabelas,
-- preenche os novos campos a partir dos antigos e troca permissões de escrita
-- direta por funções com regras (executadas no banco, com checagem de admin).
-- ============================================================================

-- Garante as colunas de frete/endereço (também criadas na migração anterior de frete).
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

-- 1. Pedidos: status separados + rastreio + idempotência ---------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'aguardando_atendimento',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pendente',
  -- 'pendente' = frete a combinar (nunca tratado como grátis); 'cotado' = cotação real; 'manual' = lojista registrou
  ADD COLUMN IF NOT EXISTS shipping_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by_email text,
  ADD COLUMN IF NOT EXISTS payment_confirmed_amount numeric,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by uuid,
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refund_note text,
  ADD COLUMN IF NOT EXISTS stock_deducted_at timestamptz,
  ADD COLUMN IF NOT EXISTS stock_restored_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_carrier text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS posted_at date,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_fulfillment_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_status_check
      CHECK (fulfillment_status IN ('aguardando_atendimento','em_preparacao','enviado','entregue','cancelado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pendente','confirmado','reembolsado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_shipping_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_shipping_status_check
      CHECK (shipping_status IN ('pendente','cotado','manual'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_idx ON public.orders (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (fulfillment_status, payment_status);

-- Pedidos antigos: traduz o status único para os dois status novos (sem perder o antigo).
-- O estoque desses pedidos é marcado como já tratado para não ser baixado de novo.
UPDATE public.orders SET
  payment_status = CASE WHEN status IN ('pago','enviado','entregue') THEN 'confirmado' ELSE 'pendente' END,
  fulfillment_status = CASE status
    WHEN 'pago' THEN 'em_preparacao'
    WHEN 'enviado' THEN 'enviado'
    WHEN 'entregue' THEN 'entregue'
    WHEN 'cancelado' THEN 'cancelado'
    ELSE 'aguardando_atendimento' END,
  payment_confirmed_at = CASE WHEN status IN ('pago','enviado','entregue') THEN updated_at END,
  payment_confirmed_amount = CASE WHEN status IN ('pago','enviado','entregue') THEN total END,
  stock_deducted_at = CASE WHEN status IN ('pago','enviado','entregue') THEN updated_at END,
  shipping_status = CASE WHEN shipping > 0 OR shipping_service <> '' THEN 'cotado' ELSE shipping_status END,
  subtotal = CASE WHEN subtotal = 0 THEN GREATEST(total - shipping, 0) ELSE subtotal END
WHERE idempotency_key IS NULL AND payment_confirmed_at IS NULL AND fulfillment_status = 'aguardando_atendimento';

-- 2. Histórico do pedido (inclui observações internas) -----------------------
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind text NOT NULL,
  message text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON public.order_events (order_id, created_at);
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
DROP POLICY IF EXISTS order_events_admin_select ON public.order_events;
CREATE POLICY order_events_admin_select ON public.order_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Estoque por produto e tamanho + movimentações ---------------------------
CREATE TABLE IF NOT EXISTS public.product_stock (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, size)
);
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
-- Disponibilidade por tamanho é pública (a loja mostra "esgotado"); escrita só pelas funções.
GRANT SELECT ON public.product_stock TO anon, authenticated;
GRANT ALL ON public.product_stock TO service_role;
DROP POLICY IF EXISTS product_stock_public_select ON public.product_stock;
CREATE POLICY product_stock_public_select ON public.product_stock FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL,
  delta integer NOT NULL,
  quantity_after integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('reposicao','ajuste','venda','cancelamento')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  note text,
  actor_id uuid,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements (product_id, created_at DESC);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
DROP POLICY IF EXISTS stock_movements_admin_select ON public.stock_movements;
CREATE POLICY stock_movements_admin_select ON public.stock_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- products.stock passa a ser o total dos tamanhos (mantido automaticamente).
CREATE OR REPLACE FUNCTION public.sync_product_stock_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE public.products SET stock = COALESCE((SELECT SUM(quantity) FROM public.product_stock WHERE product_id = _pid), 0)
   WHERE id = _pid;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS product_stock_sync_total ON public.product_stock;
CREATE TRIGGER product_stock_sync_total AFTER INSERT OR UPDATE OR DELETE ON public.product_stock
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_total();

-- 4. Escrita direta em pedidos/itens bloqueada: só leitura para admin ------------
DROP POLICY IF EXISTS orders_admin_all ON public.orders;
DROP POLICY IF EXISTS orders_admin_select ON public.orders;
CREATE POLICY orders_admin_select ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated, anon;

DROP POLICY IF EXISTS order_items_admin_all ON public.order_items;
DROP POLICY IF EXISTS order_items_admin_select ON public.order_items;
CREATE POLICY order_items_admin_select ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM authenticated, anon;

-- Defesa em profundidade: além do RLS, visitante não tem nenhum privilégio nas tabelas de pedidos/clientes,
-- e ninguém escreve direto em estoque/histórico (o Supabase concede tudo por padrão a tabelas novas).
REVOKE ALL ON public.orders, public.order_items, public.order_events, public.stock_movements, public.customers FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_stock, public.order_events, public.stock_movements FROM anon, authenticated;

-- 5. Helpers --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.actor_email()
RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULLIF(auth.jwt() ->> 'email', '') $$;

CREATE OR REPLACE FUNCTION public.log_order_event(_order uuid, _kind text, _message text, _data jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.order_events (order_id, kind, message, data, actor_id, actor_email)
  VALUES (_order, _kind, _message, COALESCE(_data, '{}'::jsonb), auth.uid(), public.actor_email());
$$;

-- 6. Criação do pedido (checkout pelo WhatsApp) — só o servidor (service_role) --
-- Idempotente: a mesma chave devolve o mesmo pedido (cliques repetidos / nova tentativa).
CREATE OR REPLACE FUNCTION public.create_checkout_order(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _key text := _payload ->> 'idempotency_key';
  _o jsonb := _payload -> 'order';
  _existing public.orders;
  _cust uuid;
  _id uuid;
  _code text;
BEGIN
  IF _key IS NULL OR length(_key) < 16 OR length(_key) > 80 THEN
    RAISE EXCEPTION 'Chave de idempotência inválida.';
  END IF;
  IF jsonb_typeof(_payload -> 'items') <> 'array' OR jsonb_array_length(_payload -> 'items') = 0 THEN
    RAISE EXCEPTION 'Pedido sem itens.';
  END IF;

  SELECT * INTO _existing FROM public.orders WHERE idempotency_key = _key;
  IF FOUND THEN
    RETURN jsonb_build_object('id', _existing.id, 'code', _existing.code, 'created', false);
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
    (_o ->> 'subtotal')::numeric, COALESCE((_o ->> 'discount')::numeric, 0), NULLIF(_o ->> 'coupon_code', ''),
    COALESCE((_o ->> 'shipping')::numeric, 0), (_o ->> 'total')::numeric, COALESCE(_o ->> 'shipping_status', 'pendente'),
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

  INSERT INTO public.order_events (order_id, kind, message, data)
  VALUES (_id, 'criado', 'Pedido criado pelo site (finalização pelo WhatsApp).',
          jsonb_build_object('total', _o ->> 'total', 'shipping_status', COALESCE(_o ->> 'shipping_status', 'pendente')));

  RETURN jsonb_build_object('id', _id, 'code', _code, 'created', true);
END $$;

-- 7. Ações do painel ------------------------------------------------------------

-- Confirma pagamento (manual) e baixa o estoque UMA vez, na mesma transação.
CREATE OR REPLACE FUNCTION public.admin_confirm_payment(_order_id uuid, _amount numeric, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.orders;
  it record;
  avail integer;
  problems text[] := '{}';
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF o.payment_status = 'confirmado' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  IF o.payment_status <> 'pendente' THEN
    RAISE EXCEPTION 'O pagamento deste pedido está "%" e não pode ser confirmado.', o.payment_status;
  END IF;
  IF o.fulfillment_status = 'cancelado' THEN
    RAISE EXCEPTION 'Pedido cancelado não pode ter pagamento confirmado.';
  END IF;
  IF o.shipping_status = 'pendente' THEN
    RAISE EXCEPTION 'Frete pendente: registre o valor do frete antes de confirmar o pagamento.';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Informe o valor recebido.';
  END IF;
  IF abs(_amount - o.total) >= 0.01 THEN
    RAISE EXCEPTION 'Valor recebido (R$ %) diferente do total do pedido (R$ %). Ajuste o frete/total ou confira o pagamento.',
      to_char(_amount, 'FM999999990.00'), to_char(o.total, 'FM999999990.00');
  END IF;

  IF o.stock_deducted_at IS NULL THEN
    -- Trava as linhas de estoque em ordem fixa (evita deadlock entre confirmações simultâneas).
    FOR it IN
      SELECT oi.product_id, oi.size, SUM(oi.quantity)::int AS q, MAX(oi.product_name) AS name
        FROM public.order_items oi WHERE oi.order_id = o.id
       GROUP BY oi.product_id, oi.size ORDER BY oi.product_id, oi.size
    LOOP
      IF it.product_id IS NULL THEN
        problems := problems || format('%s: produto removido do catálogo', it.name);
        CONTINUE;
      END IF;
      SELECT quantity INTO avail FROM public.product_stock
       WHERE product_id = it.product_id AND size = it.size FOR UPDATE;
      IF NOT FOUND THEN
        problems := problems || format('%s tam. %s: estoque não cadastrado', it.name, it.size);
      ELSIF avail < it.q THEN
        problems := problems || format('%s tam. %s: precisa %s, disponível %s', it.name, it.size, it.q, avail);
      END IF;
    END LOOP;
    IF array_length(problems, 1) > 0 THEN
      RAISE EXCEPTION 'Estoque insuficiente — %', array_to_string(problems, '; ');
    END IF;

    FOR it IN
      SELECT oi.product_id, oi.size, SUM(oi.quantity)::int AS q
        FROM public.order_items oi WHERE oi.order_id = o.id
       GROUP BY oi.product_id, oi.size ORDER BY oi.product_id, oi.size
    LOOP
      UPDATE public.product_stock SET quantity = quantity - it.q, updated_at = now()
       WHERE product_id = it.product_id AND size = it.size
       RETURNING quantity INTO avail;
      INSERT INTO public.stock_movements (product_id, size, delta, quantity_after, reason, order_id, actor_id, actor_email, note)
      VALUES (it.product_id, it.size, -it.q, avail, 'venda', o.id, auth.uid(), public.actor_email(), 'Pedido ' || o.code);
    END LOOP;
  END IF;

  UPDATE public.orders SET
    payment_status = 'confirmado',
    status = 'pago',
    payment_confirmed_at = now(),
    payment_confirmed_by = auth.uid(),
    payment_confirmed_by_email = public.actor_email(),
    payment_confirmed_amount = _amount,
    stock_deducted_at = COALESCE(stock_deducted_at, now())
  WHERE id = o.id;

  PERFORM public.log_order_event(o.id, 'pagamento_confirmado',
    format('Pagamento confirmado: R$ %s.', to_char(_amount, 'FM999999990.00')) || COALESCE(' ' || NULLIF(_note, ''), ''),
    jsonb_build_object('amount', _amount, 'stock_deducted', o.stock_deducted_at IS NULL));
  RETURN jsonb_build_object('ok', true, 'already', false);
END $$;

-- Atendimento/entrega com transições válidas.
CREATE OR REPLACE FUNCTION public.admin_set_fulfillment(
  _order_id uuid, _to text, _carrier text DEFAULT NULL, _tracking text DEFAULT NULL, _posted_at date DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF o.fulfillment_status = _to THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  IF o.fulfillment_status = 'cancelado' THEN RAISE EXCEPTION 'Pedido cancelado não pode mudar de situação.'; END IF;

  IF _to = 'em_preparacao' THEN
    IF o.fulfillment_status <> 'aguardando_atendimento' THEN RAISE EXCEPTION 'Só pedidos aguardando atendimento vão para preparação.'; END IF;
    IF o.payment_status <> 'confirmado' THEN RAISE EXCEPTION 'Confirme o pagamento antes de preparar o pedido.'; END IF;
    UPDATE public.orders SET fulfillment_status = 'em_preparacao' WHERE id = o.id;
    PERFORM public.log_order_event(o.id, 'em_preparacao', 'Pedido em preparação.');
  ELSIF _to = 'enviado' THEN
    IF o.fulfillment_status <> 'em_preparacao' THEN RAISE EXCEPTION 'Só pedidos em preparação podem ser marcados como enviados.'; END IF;
    IF o.payment_status <> 'confirmado' THEN RAISE EXCEPTION 'Pagamento não confirmado.'; END IF;
    IF COALESCE(btrim(_carrier), '') = '' THEN RAISE EXCEPTION 'Informe a transportadora.'; END IF;
    UPDATE public.orders SET fulfillment_status = 'enviado', status = 'enviado',
      tracking_carrier = btrim(_carrier), tracking_code = COALESCE(btrim(_tracking), ''),
      posted_at = COALESCE(_posted_at, current_date)
     WHERE id = o.id;
    PERFORM public.log_order_event(o.id, 'enviado',
      format('Enviado por %s%s.', btrim(_carrier), CASE WHEN COALESCE(btrim(_tracking), '') <> '' THEN ' — rastreio ' || btrim(_tracking) ELSE '' END),
      jsonb_build_object('carrier', _carrier, 'tracking', _tracking, 'posted_at', COALESCE(_posted_at, current_date)));
  ELSIF _to = 'entregue' THEN
    IF o.fulfillment_status <> 'enviado' THEN RAISE EXCEPTION 'Só pedidos enviados podem ser marcados como entregues.'; END IF;
    UPDATE public.orders SET fulfillment_status = 'entregue', status = 'entregue', delivered_at = now() WHERE id = o.id;
    PERFORM public.log_order_event(o.id, 'entregue', 'Pedido entregue.');
  ELSE
    RAISE EXCEPTION 'Situação inválida. Para cancelar, use "Cancelar pedido".';
  END IF;
  RETURN jsonb_build_object('ok', true, 'already', false);
END $$;

-- Atualiza dados de rastreio de pedido já enviado.
CREATE OR REPLACE FUNCTION public.admin_update_tracking(_order_id uuid, _carrier text, _tracking text, _posted_at date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF o.fulfillment_status NOT IN ('enviado','entregue') THEN RAISE EXCEPTION 'O rastreio é registrado ao marcar o pedido como enviado.'; END IF;
  IF COALESCE(btrim(_carrier), '') = '' THEN RAISE EXCEPTION 'Informe a transportadora.'; END IF;
  UPDATE public.orders SET tracking_carrier = btrim(_carrier), tracking_code = COALESCE(btrim(_tracking), ''),
    posted_at = COALESCE(_posted_at, posted_at) WHERE id = o.id;
  PERFORM public.log_order_event(o.id, 'rastreio', format('Rastreio atualizado: %s %s.', btrim(_carrier), COALESCE(btrim(_tracking), '')),
    jsonb_build_object('before', jsonb_build_object('carrier', o.tracking_carrier, 'tracking', o.tracking_code, 'posted_at', o.posted_at)));
  RETURN jsonb_build_object('ok', true);
END $$;

-- Cancela o pedido. Devolve o estoque no máximo uma vez (se tinha sido baixado). Não mexe em dinheiro.
CREATE OR REPLACE FUNCTION public.admin_cancel_order(_order_id uuid, _reason text, _restock boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.orders;
  it record;
  q integer;
  restocked boolean := false;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF o.fulfillment_status = 'cancelado' THEN RETURN jsonb_build_object('ok', true, 'already', true, 'restocked', false); END IF;
  IF o.fulfillment_status IN ('enviado','entregue') THEN
    RAISE EXCEPTION 'Pedido já enviado não pode ser cancelado aqui. Registre a devolução/reembolso.';
  END IF;
  IF COALESCE(btrim(_reason), '') = '' THEN RAISE EXCEPTION 'Informe o motivo do cancelamento.'; END IF;

  IF _restock AND o.stock_deducted_at IS NOT NULL AND o.stock_restored_at IS NULL THEN
    FOR it IN
      SELECT oi.product_id, oi.size, SUM(oi.quantity)::int AS q
        FROM public.order_items oi WHERE oi.order_id = o.id AND oi.product_id IS NOT NULL
       GROUP BY oi.product_id, oi.size ORDER BY oi.product_id, oi.size
    LOOP
      INSERT INTO public.product_stock (product_id, size, quantity) VALUES (it.product_id, it.size, it.q)
      ON CONFLICT (product_id, size) DO UPDATE SET quantity = public.product_stock.quantity + EXCLUDED.quantity, updated_at = now()
      RETURNING quantity INTO q;
      INSERT INTO public.stock_movements (product_id, size, delta, quantity_after, reason, order_id, actor_id, actor_email, note)
      VALUES (it.product_id, it.size, it.q, q, 'cancelamento', o.id, auth.uid(), public.actor_email(), 'Cancelamento do pedido ' || o.code);
    END LOOP;
    restocked := true;
  END IF;

  UPDATE public.orders SET fulfillment_status = 'cancelado', status = 'cancelado', cancelled_at = now(),
    cancel_reason = btrim(_reason), stock_restored_at = CASE WHEN restocked THEN now() ELSE stock_restored_at END
   WHERE id = o.id;
  PERFORM public.log_order_event(o.id, 'cancelado',
    'Pedido cancelado: ' || btrim(_reason) || CASE WHEN restocked THEN ' Estoque devolvido.' ELSE '' END,
    jsonb_build_object('restocked', restocked, 'payment_status', o.payment_status));
  RETURN jsonb_build_object('ok', true, 'already', false, 'restocked', restocked);
END $$;

-- Registro de reembolso (o dinheiro é devolvido pelo lojista fora do sistema).
CREATE OR REPLACE FUNCTION public.admin_register_refund(_order_id uuid, _amount numeric, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF o.payment_status = 'reembolsado' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  IF o.payment_status <> 'confirmado' THEN RAISE EXCEPTION 'Só pedidos com pagamento confirmado podem ter reembolso registrado.'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > COALESCE(o.payment_confirmed_amount, o.total) + 0.001 THEN
    RAISE EXCEPTION 'Valor de reembolso inválido (máximo R$ %).', to_char(COALESCE(o.payment_confirmed_amount, o.total), 'FM999999990.00');
  END IF;
  UPDATE public.orders SET payment_status = 'reembolsado', refunded_at = now(), refunded_by = auth.uid(),
    refund_amount = _amount, refund_note = NULLIF(btrim(_note), '') WHERE id = o.id;
  PERFORM public.log_order_event(o.id, 'reembolso',
    format('Reembolso registrado: R$ %s.', to_char(_amount, 'FM999999990.00')) || COALESCE(' ' || NULLIF(btrim(_note), ''), ''),
    jsonb_build_object('amount', _amount));
  RETURN jsonb_build_object('ok', true, 'already', false);
END $$;

-- Frete manual (quando não houve cotação): só antes da confirmação do pagamento.
CREATE OR REPLACE FUNCTION public.admin_set_shipping(_order_id uuid, _amount numeric, _service text, _days text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; new_total numeric;
BEGIN
  PERFORM public.assert_admin();
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF o.payment_status <> 'pendente' THEN RAISE EXCEPTION 'O frete só pode mudar antes da confirmação do pagamento.'; END IF;
  IF o.fulfillment_status = 'cancelado' THEN RAISE EXCEPTION 'Pedido cancelado.'; END IF;
  IF _amount IS NULL OR _amount < 0 OR _amount > 10000 THEN RAISE EXCEPTION 'Valor de frete inválido.'; END IF;
  IF COALESCE(btrim(_service), '') = '' THEN RAISE EXCEPTION 'Informe a modalidade/transportadora do frete.'; END IF;
  new_total := round(GREATEST(o.subtotal - o.discount, 0) + _amount, 2);
  UPDATE public.orders SET shipping = round(_amount, 2), shipping_status = 'manual', shipping_service = btrim(_service),
    shipping_service_key = 'manual', shipping_carrier = btrim(_service), total = new_total,
    shipping_days_min = NULLIF(substring(COALESCE(_days, '') from '^\s*(\d+)'), '')::int,
    shipping_days_max = NULLIF(substring(COALESCE(_days, '') from '(\d+)\s*$'), '')::int,
    shipping_quoted_at = now()
   WHERE id = o.id;
  PERFORM public.log_order_event(o.id, 'frete',
    format('Frete registrado manualmente: %s — R$ %s. Total: R$ %s → R$ %s.', btrim(_service), to_char(_amount, 'FM999999990.00'),
      to_char(o.total, 'FM999999990.00'), to_char(new_total, 'FM999999990.00')),
    jsonb_build_object('before', jsonb_build_object('shipping', o.shipping, 'status', o.shipping_status, 'total', o.total), 'after_total', new_total));
  RETURN jsonb_build_object('ok', true, 'total', new_total);
END $$;

-- Observação interna (não aparece para o comprador).
CREATE OR REPLACE FUNCTION public.admin_add_order_note(_order_id uuid, _text text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_admin();
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id) THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF COALESCE(btrim(_text), '') = '' OR length(_text) > 2000 THEN RAISE EXCEPTION 'Escreva a observação (até 2000 caracteres).'; END IF;
  PERFORM public.log_order_event(_order_id, 'nota', btrim(_text));
  RETURN jsonb_build_object('ok', true);
END $$;

-- Reposição / ajuste de estoque com histórico. Nunca deixa negativo.
CREATE OR REPLACE FUNCTION public.admin_adjust_stock(_product_id uuid, _size text, _delta integer, _reason text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur integer; next integer; sz text := upper(btrim(_size));
BEGIN
  PERFORM public.assert_admin();
  IF _reason NOT IN ('reposicao','ajuste') THEN RAISE EXCEPTION 'Motivo inválido.'; END IF;
  IF sz = '' OR length(sz) > 20 THEN RAISE EXCEPTION 'Tamanho inválido.'; END IF;
  IF _delta = 0 OR _delta IS NULL OR abs(_delta) > 100000 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
  IF _reason = 'reposicao' AND _delta < 0 THEN RAISE EXCEPTION 'Reposição deve somar unidades (use ajuste para retirar).'; END IF;
  IF _reason = 'ajuste' AND COALESCE(btrim(_note), '') = '' THEN RAISE EXCEPTION 'Explique o motivo do ajuste.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = _product_id) THEN RAISE EXCEPTION 'Produto não encontrado.'; END IF;

  SELECT quantity INTO cur FROM public.product_stock WHERE product_id = _product_id AND size = sz FOR UPDATE;
  cur := COALESCE(cur, 0);
  next := cur + _delta;
  IF next < 0 THEN RAISE EXCEPTION 'O ajuste deixaria o estoque negativo (atual: %).', cur; END IF;

  INSERT INTO public.product_stock (product_id, size, quantity) VALUES (_product_id, sz, next)
  ON CONFLICT (product_id, size) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now();
  INSERT INTO public.stock_movements (product_id, size, delta, quantity_after, reason, note, actor_id, actor_email)
  VALUES (_product_id, sz, _delta, next, _reason, NULLIF(btrim(_note), ''), auth.uid(), public.actor_email());
  RETURN jsonb_build_object('ok', true, 'quantity', next);
END $$;

-- Resumo do painel (só números reais). Receita = pagamentos confirmados, sem cancelados/reembolsados.
CREATE OR REPLACE FUNCTION public.admin_dashboard(_from timestamptz, _to timestamptz, _low_stock integer DEFAULT 3)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  PERFORM public.assert_admin();
  SELECT jsonb_build_object(
    'awaiting', (SELECT count(*) FROM public.orders WHERE fulfillment_status = 'aguardando_atendimento'),
    'payment_pending', (SELECT count(*) FROM public.orders WHERE payment_status = 'pendente' AND fulfillment_status <> 'cancelado'),
    'shipping_pending', (SELECT count(*) FROM public.orders WHERE shipping_status = 'pendente' AND fulfillment_status <> 'cancelado' AND payment_status = 'pendente'),
    'paid_to_ship', (SELECT count(*) FROM public.orders WHERE payment_status = 'confirmado' AND fulfillment_status IN ('aguardando_atendimento','em_preparacao')),
    'revenue', (SELECT COALESCE(SUM(payment_confirmed_amount), 0) FROM public.orders
                 WHERE payment_status = 'confirmado' AND fulfillment_status <> 'cancelado'
                   AND payment_confirmed_at >= _from AND payment_confirmed_at < _to),
    'paid_orders', (SELECT count(*) FROM public.orders
                 WHERE payment_status = 'confirmado' AND fulfillment_status <> 'cancelado'
                   AND payment_confirmed_at >= _from AND payment_confirmed_at < _to),
    'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d, 'total', t) ORDER BY d), '[]'::jsonb) FROM (
                SELECT date_trunc('day', payment_confirmed_at)::date AS d, SUM(payment_confirmed_amount) AS t
                  FROM public.orders
                 WHERE payment_status = 'confirmado' AND fulfillment_status <> 'cancelado'
                   AND payment_confirmed_at >= _from AND payment_confirmed_at < _to
                 GROUP BY 1) s),
    'low_stock', (SELECT COALESCE(jsonb_agg(jsonb_build_object('product_id', p.id, 'name', p.name, 'size', ps.size, 'quantity', ps.quantity)
                    ORDER BY ps.quantity, p.name), '[]'::jsonb)
                  FROM public.product_stock ps JOIN public.products p ON p.id = ps.product_id
                  WHERE p.active AND ps.quantity <= _low_stock),
    'untracked_products', (SELECT count(*) FROM public.products p WHERE p.active
                 AND NOT EXISTS (SELECT 1 FROM public.product_stock ps WHERE ps.product_id = p.id))
  ) INTO r;
  RETURN r;
END $$;

-- 8. Permissões das funções ---------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.log_order_event(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_stock_total() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.admin_confirm_payment(uuid, numeric, text)',
    'public.admin_set_fulfillment(uuid, text, text, text, date)',
    'public.admin_update_tracking(uuid, text, text, date)',
    'public.admin_cancel_order(uuid, text, boolean)',
    'public.admin_register_refund(uuid, numeric, text)',
    'public.admin_set_shipping(uuid, numeric, text, text)',
    'public.admin_add_order_note(uuid, text)',
    'public.admin_adjust_stock(uuid, text, integer, text, text)',
    'public.admin_dashboard(timestamptz, timestamptz, integer)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;

-- Configuração operacional (WhatsApp da loja etc.) começa vazia; o site usa o número padrão até ser preenchida.
INSERT INTO public.store_settings (key, value) VALUES ('operacao', '{}'::jsonb) ON CONFLICT (key) DO NOTHING;

-- Produto que já foi vendido não é apagado (os pedidos guardam o histórico): desative-o.
CREATE OR REPLACE FUNCTION public.block_delete_sold_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.order_items WHERE product_id = OLD.id) THEN
    RAISE EXCEPTION 'Este produto já tem pedidos e não pode ser removido. Desative-o para tirá-lo da loja.';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS products_block_delete_sold ON public.products;
CREATE TRIGGER products_block_delete_sold BEFORE DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.block_delete_sold_product();
REVOKE ALL ON FUNCTION public.block_delete_sold_product() FROM PUBLIC, anon, authenticated;
