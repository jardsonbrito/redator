-- A política "Admins gerenciam configs" usa auth.uid() que retorna null
-- para usuários com auth customizada (admin e professor usam localStorage).
-- Resultado: apenas configs ATIVAS aparecem (pela policy "Todos leem config ativa").
-- Fix: permitir leitura de todas as configs para qualquer role.

DROP POLICY IF EXISTS "Todos leem config ativa" ON jarvis_correcao_config;
DROP POLICY IF EXISTS "Admins gerenciam configs" ON jarvis_correcao_config;

-- Leitura liberada para todos (configs não são dados sensíveis)
CREATE POLICY "Leitura livre de configs"
  ON jarvis_correcao_config FOR SELECT
  USING (true);

-- Escrita ainda restrita a admins autenticados via Supabase Auth ou service role
CREATE POLICY "Admins escrevem configs"
  ON jarvis_correcao_config FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
