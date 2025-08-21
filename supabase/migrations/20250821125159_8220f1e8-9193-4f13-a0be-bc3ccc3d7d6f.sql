-- Criar índices para melhorar performance das consultas do Radar
CREATE INDEX IF NOT EXISTS idx_lousa_resposta_submitted_at_email ON lousa_resposta (submitted_at, email_aluno);
CREATE INDEX IF NOT EXISTS idx_presenca_aulas_entrada_email ON presenca_aulas (entrada_at, email_aluno);
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_data_email ON redacoes_enviadas (data_envio, email_aluno);
CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_data_email ON redacoes_simulado (data_envio, email_aluno);
CREATE INDEX IF NOT EXISTS idx_redacoes_exercicio_data_email ON redacoes_exercicio (data_envio, email_aluno);