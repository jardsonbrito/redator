-- Fix: políticas de admin nas tabelas de redações comentadas agora aceitam
-- tanto auth.uid() = admin_users.id  OU  auth.email() = admin_users.email
-- Necessário porque jardsonbrito@gmail.com tem IDs divergentes entre
-- admin_users e auth.users.

DROP POLICY IF EXISTS "Admin gerencia blocos" ON public.redacao_comentada_blocos;
CREATE POLICY "Admin gerencia blocos" ON public.redacao_comentada_blocos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
         OR admin_users.email = auth.email()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
         OR admin_users.email = auth.email()
    )
  );

DROP POLICY IF EXISTS "Admin gerencia redações comentadas" ON public.redacoes_comentadas;
CREATE POLICY "Admin gerencia redações comentadas" ON public.redacoes_comentadas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
         OR admin_users.email = auth.email()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
         OR admin_users.email = auth.email()
    )
  );
