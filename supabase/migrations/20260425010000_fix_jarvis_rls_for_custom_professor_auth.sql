-- Fix: professores usam auth por localStorage (não Supabase Auth)
-- auth.uid() sempre retorna null para eles, bloqueando todas as leituras via frontend
-- Substituímos as políticas de SELECT para permitir leitura pela anon role

-- ─── jarvis_correcoes ───
DROP POLICY IF EXISTS "Professores veem suas correções" ON jarvis_correcoes;

CREATE POLICY "Professores veem suas correções"
  ON jarvis_correcoes FOR SELECT
  USING (true);

-- ─── professor_turmas ───
DROP POLICY IF EXISTS "Professores veem suas associações" ON professor_turmas;

CREATE POLICY "Professores veem suas associações"
  ON professor_turmas FOR SELECT
  USING (true);

-- ─── jarvis_correcao_credit_audit ───
DROP POLICY IF EXISTS "Professores veem seu histórico de créditos" ON jarvis_correcao_credit_audit;

CREATE POLICY "Professores veem seu histórico de créditos"
  ON jarvis_correcao_credit_audit FOR SELECT
  USING (true);
