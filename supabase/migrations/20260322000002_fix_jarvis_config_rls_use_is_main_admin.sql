-- Corrige RLS da jarvis_config para usar is_main_admin() (padrão do projeto)
-- O critério anterior (admin_users.id = auth.uid()) estava errado porque
-- admin_users.id é um UUID independente, diferente do auth.uid() do Supabase Auth.

DROP POLICY IF EXISTS "Admins gerenciam configs" ON jarvis_config;
DROP POLICY IF EXISTS "Todos podem ler configs ativas" ON jarvis_config;

-- Admin gerencia tudo (igual ao padrão de temas, aulas, simulados)
CREATE POLICY "Admin can manage jarvis_config"
  ON jarvis_config FOR ALL
  TO authenticated
  USING (is_main_admin());

-- Leitura pública de configs ativas (para a página do Jarvis dos alunos)
CREATE POLICY "Public can read active jarvis_config"
  ON jarvis_config FOR SELECT
  TO public
  USING (ativo = true);

-- Corrige também as políticas das outras tabelas Jarvis com o mesmo bug
DROP POLICY IF EXISTS "Admins veem todo histórico Jarvis" ON jarvis_credit_audit;
CREATE POLICY "Admin can view all jarvis_credit_audit"
  ON jarvis_credit_audit FOR SELECT
  TO authenticated
  USING (is_main_admin());

DROP POLICY IF EXISTS "Admins veem todas interações Jarvis" ON jarvis_interactions;
CREATE POLICY "Admin can view all jarvis_interactions"
  ON jarvis_interactions FOR SELECT
  TO authenticated
  USING (is_main_admin());
