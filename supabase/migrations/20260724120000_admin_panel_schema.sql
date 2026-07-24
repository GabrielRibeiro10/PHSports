-- Admin panel schema: categories, products, roles, storage bucket for product images.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / DO blocks.

-- 1. Roles -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- security definer function so RLS policies can check roles without recursion
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

drop policy if exists "Users can view their own roles" on public.user_roles;
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

drop policy if exists "Admins manage roles" on public.user_roles;
create policy "Admins manage roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 2. Product category enum ---------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_category') then
    create type public.product_category as enum ('masculino','feminino','retro','caneleiras','jogador');
  end if;
end $$;

-- 3. updated_at trigger helper ------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 4. Categories -----------------------------------------------------------
create table if not exists public.categories (
  id public.product_category primary key,
  slug text not null unique,
  name text not null,
  emoji text not null default '',
  tagline text not null default '',
  image_url text not null default '',
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "Public can view categories" on public.categories;
create policy "Public can view categories"
  on public.categories for select
  using (true);

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
  on public.categories for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- 5. Products ---------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  club text not null,
  image_url text not null default '',
  price numeric(10,2) not null default 0,
  old_price numeric(10,2) not null default 0,
  discount int not null default 0,
  colors text[] not null default '{}',
  category public.product_category not null,
  sizes text[],
  description text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
  on public.products for select
  using (active = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
  on public.products for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index if not exists products_category_idx on public.products (category);

-- 6. Realtime: let the storefront react instantly to admin edits -----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;

-- 7. Storage bucket for product/category images -----------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
