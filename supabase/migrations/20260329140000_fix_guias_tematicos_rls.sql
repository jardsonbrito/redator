-- Corrige as políticas RLS de guias_tematicos.
-- A política anterior usava TO authenticated, que nunca é aplicada
-- porque o admin deste projeto usa autenticação customizada (public role).
-- O padrão correto é TO public com is_main_admin().

DROP POLICY IF EXISTS "guias_tematicos_admin_all" ON guias_tematicos;
DROP POLICY IF EXISTS "guias_tematicos_select_ativos" ON guias_tematicos;

-- Leitura pública para guias ativos (alunos/visitantes)
CREATE POLICY "guias_tematicos_select_ativos"
  ON guias_tematicos FOR SELECT
  TO public
  USING (ativo = true);

-- Admin pode ver todos (inclusive inativos)
CREATE POLICY "guias_tematicos_admin_select"
  ON guias_tematicos FOR SELECT
  TO public
  USING (public.is_main_admin());

-- Admin pode inserir
CREATE POLICY "guias_tematicos_admin_insert"
  ON guias_tematicos FOR INSERT
  TO public
  WITH CHECK (public.is_main_admin());

-- Admin pode atualizar
CREATE POLICY "guias_tematicos_admin_update"
  ON guias_tematicos FOR UPDATE
  TO public
  USING (public.is_main_admin());

-- Admin pode excluir
CREATE POLICY "guias_tematicos_admin_delete"
  ON guias_tematicos FOR DELETE
  TO public
  USING (public.is_main_admin());
