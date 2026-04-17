-- Adicionar campo ativo à tabela redacoes
ALTER TABLE public.redacoes
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Criar índice para melhorar performance de consultas filtradas por ativo
CREATE INDEX IF NOT EXISTS idx_redacoes_ativo ON public.redacoes(ativo);

-- Comentário explicando o campo
COMMENT ON COLUMN public.redacoes.ativo IS 'Indica se a redação exemplar está ativa e visível para os usuários';
