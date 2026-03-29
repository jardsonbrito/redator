-- Corrige as políticas RLS de guias_tematicos.
-- Usa TO authenticated com auth.email() contra admin_users,
-- igual ao padrão que funciona para temas/videos.

DROP POLICY IF EXISTS "guias_tematicos_admin_all" ON guias_tematicos;
DROP POLICY IF EXISTS "guias_tematicos_select_ativos" ON guias_tematicos;
DROP POLICY IF EXISTS "guias_tematicos_admin_select" ON guias_tematicos;
DROP POLICY IF EXISTS "guias_tematicos_admin_insert" ON guias_tematicos;
DROP POLICY IF EXISTS "guias_tematicos_admin_update" ON guias_tematicos;
DROP POLICY IF EXISTS "guias_tematicos_admin_delete" ON guias_tematicos;

-- Leitura pública para guias ativos (alunos/visitantes)
CREATE POLICY "guias_tematicos_select_ativos"
  ON guias_tematicos FOR SELECT
  TO public
  USING (ativo = true);

-- Admin gerencia tudo (TO authenticated, igual a temas/videos)
CREATE POLICY "guias_tematicos_admin_all"
  ON guias_tematicos FOR ALL
  TO authenticated
  USING (
    auth.email() IN (SELECT email FROM admin_users WHERE ativo = true)
  )
  WITH CHECK (
    auth.email() IN (SELECT email FROM admin_users WHERE ativo = true)
  );
