-- Adiciona mensagem configurável exibida ao aluno quando estiver sem créditos no Jarvis
INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  (
    'mensagem_sem_creditos',
    'Você não possui créditos disponíveis para usar o Jarvis. Fale com seu professor para solicitar mais créditos.',
    'Mensagem exibida em pop-up quando o aluno tenta usar o Jarvis sem créditos'
  )
ON CONFLICT (chave) DO NOTHING;
