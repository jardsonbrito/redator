-- Adiciona políticas de DELETE em jarvis_correcoes
-- Professores podem deletar suas próprias correções
CREATE POLICY "Professores deletam suas correções"
  ON jarvis_correcoes FOR DELETE
  USING (professor_id = auth.uid());

-- Admins podem deletar qualquer correção
CREATE POLICY "Admins deletam correções"
  ON jarvis_correcoes FOR DELETE
  USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM admin_users WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ) AND ativo = true
  ));
