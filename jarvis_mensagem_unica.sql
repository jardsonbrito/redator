-- Migrar para mensagem única no sistema Jarvis
-- Deletar mensagens antigas (se existirem)
DELETE FROM jarvis_system_config
WHERE chave IN ('mensagem_sem_config', 'mensagem_erro_verificacao');

-- Inserir nova mensagem única
INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  ('mensagem_sistema', 'Assistente de escrita em fase de teste.', 'Mensagem exibida aos alunos quando o Jarvis está indisponível')
ON CONFLICT (chave)
DO UPDATE SET
  valor = EXCLUDED.valor,
  descricao = EXCLUDED.descricao,
  atualizado_em = NOW();
