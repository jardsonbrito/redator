
-- Adicionar campos nome_aluno e email_aluno à tabela redacoes_enviadas
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN nome_aluno TEXT,
ADD COLUMN email_aluno TEXT;

-- Criar índices para melhorar performance
CREATE INDEX idx_redacoes_enviadas_nome_aluno ON public.redacoes_enviadas(nome_aluno);
CREATE INDEX idx_redacoes_enviadas_email_aluno ON public.redacoes_enviadas(email_aluno);
