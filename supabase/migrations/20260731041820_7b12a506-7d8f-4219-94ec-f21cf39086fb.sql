
-- PRODUCTS: gallery + stock + featured + brand
CREATE TABLE public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_public_select" ON public.brands FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "brands_admin_insert" ON public.brands FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "brands_admin_update" ON public.brands FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "brands_admin_delete" ON public.brands FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER brands_set_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url_2 text not null default '',
  ADD COLUMN IF NOT EXISTS image_url_3 text not null default '',
  ADD COLUMN IF NOT EXISTS image_url_4 text not null default '',
  ADD COLUMN IF NOT EXISTS stock integer not null default 0,
  ADD COLUMN IF NOT EXISTS featured boolean not null default false,
  ADD COLUMN IF NOT EXISTS brand_id uuid references public.brands(id) on delete set null;

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS active boolean not null default true;

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null default '',
  email text not null default '',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_admin_all" ON public.customers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORDERS
CREATE TYPE public.order_status AS ENUM ('pendente','pago','enviado','entregue','cancelado');
CREATE TABLE public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('PH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null default '',
  customer_whatsapp text not null default '',
  status public.order_status not null default 'pendente',
  payment_method text not null default 'pix',
  total numeric not null default 0,
  shipping numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  size text,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_admin_all" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- COUPONS
CREATE TABLE public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null default 'percent',
  discount_value numeric not null default 0,
  expires_at date,
  max_uses integer not null default 0,
  used_count integer not null default 0,
  min_order_value numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_admin_all" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER coupons_set_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- REVIEWS
CREATE TYPE public.review_status AS ENUM ('pendente','aprovada','reprovada');
CREATE TABLE public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  author_name text not null default '',
  rating integer not null default 5,
  comment text not null default '',
  status public.review_status not null default 'pendente',
  reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_select" ON public.reviews FOR SELECT TO anon, authenticated USING (status = 'aprovada' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "reviews_admin_insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "reviews_admin_update" ON public.reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "reviews_admin_delete" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SHIPPING
CREATE TABLE public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  price numeric not null default 0,
  free_above numeric not null default 0,
  delivery_days text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.shipping_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_zones TO authenticated;
GRANT ALL ON public.shipping_zones TO service_role;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipping_public_select" ON public.shipping_zones FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "shipping_admin_insert" ON public.shipping_zones FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "shipping_admin_update" ON public.shipping_zones FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "shipping_admin_delete" ON public.shipping_zones FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER shipping_set_updated_at BEFORE UPDATE ON public.shipping_zones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STORE SETTINGS (key/value)
CREATE TABLE public.store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_select" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_admin_insert" ON public.store_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "settings_admin_update" ON public.store_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "settings_admin_delete" ON public.store_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.shipping_zones (region, price, free_above, delivery_days, sort_order) VALUES
  ('Sudeste', 24.90, 299.00, '3 a 6 dias úteis', 1),
  ('Sul', 29.90, 299.00, '4 a 8 dias úteis', 2),
  ('Centro-Oeste', 32.90, 349.00, '5 a 9 dias úteis', 3),
  ('Nordeste', 36.90, 349.00, '6 a 12 dias úteis', 4),
  ('Norte', 39.90, 399.00, '7 a 14 dias úteis', 5);
