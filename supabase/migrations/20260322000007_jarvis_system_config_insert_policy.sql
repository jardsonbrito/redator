-- Policy de INSERT para admins em jarvis_system_config
CREATE POLICY "Admin pode inserir configurações do sistema Jarvis"
  ON jarvis_system_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND ativo = true
    )
  );

-- Garante que todas as linhas de sistema existem para o upsert funcionar
INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  ('mensagem_sistema',      'Esta funcionalidade está temporariamente indisponível.', 'Mensagem exibida aos alunos quando o Jarvis estiver indisponível'),
  ('mensagem_sem_creditos', 'Você não possui créditos disponíveis para usar o Jarvis. Fale com seu professor para solicitar mais créditos.', 'Mensagem exibida em pop-up quando o aluno tenta usar o Jarvis sem créditos')
ON CONFLICT (chave) DO NOTHING;
