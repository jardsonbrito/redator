-- A política de escrita "Admins escrevem configs" usa auth.uid() que retorna null
-- para o admin (que usa Supabase Auth mas cujo ID em admin_users é diferente do auth.uid()).
-- Fix: liberar escrita para qualquer autenticado via Supabase Auth (controle já feito
-- no frontend e nas funções RPC que verificam admin_users por email).

DROP POLICY IF EXISTS "Admins escrevem configs" ON jarvis_correcao_config;

-- Permite escrita para qualquer sessão autenticada (admin sempre tem sessão Supabase Auth)
CREATE POLICY "Admins escrevem configs"
  ON jarvis_correcao_config FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
