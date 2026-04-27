-- Corrige política DELETE de turmas_professores para usar is_main_admin()
-- (consistente com INSERT e UPDATE que já usam is_main_admin())
-- A política anterior usava auth.uid() que não corresponde ao admin_users.id

DROP POLICY IF EXISTS "Admin deleta turmas_professores" ON public.turmas_professores;

CREATE POLICY "Admin deleta turmas_professores"
  ON public.turmas_professores
  FOR DELETE
  USING (public.is_main_admin());
