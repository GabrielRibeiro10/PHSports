-- Fix mutable search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Remove broad SELECT policy that allowed listing all files in product-images.
-- Public URLs continue to work because the bucket is public (CDN-served).
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;