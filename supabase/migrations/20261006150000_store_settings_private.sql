-- Configurações da loja (chave Pix, titular, WhatsApp, origem do frete) só para admins.
-- A loja não lê esta tabela pelo navegador: o servidor usa a chave de serviço (ignora RLS).
DROP POLICY IF EXISTS "settings_public_select" ON public.store_settings;
DROP POLICY IF EXISTS settings_admin_select ON public.store_settings;
CREATE POLICY settings_admin_select ON public.store_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.store_settings FROM anon;
