-- Fix RLS para jarvis_correcao_banco_comentarios e jarvis_correcao_modelos_referencia
-- O admin usa Supabase Auth customizada: auth.uid() não bate com admin_users.id
-- Fix: liberar para qualquer sessão autenticada (controle feito no frontend por email)

DROP POLICY IF EXISTS "Admins gerenciam banco de comentários" ON jarvis_correcao_banco_comentarios;

CREATE POLICY "Admins gerenciam banco de comentários"
  ON jarvis_correcao_banco_comentarios FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins gerenciam modelos de referência" ON jarvis_correcao_modelos_referencia;

CREATE POLICY "Admins gerenciam modelos de referência"
  ON jarvis_correcao_modelos_referencia FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
