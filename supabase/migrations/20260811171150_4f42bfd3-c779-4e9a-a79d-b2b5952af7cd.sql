ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS starts_at date;

CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _updated int;
begin
  update public.coupons
     set used_count = used_count + 1
   where upper(code) = upper(_code)
     and active = true
     and (starts_at is null or starts_at <= current_date)
     and (expires_at is null or expires_at >= current_date)
     and (max_uses = 0 or used_count < max_uses);
  get diagnostics _updated = row_count;
  return _updated > 0;
end;
$$;

REVOKE ALL ON FUNCTION public.redeem_coupon(text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO service_role;