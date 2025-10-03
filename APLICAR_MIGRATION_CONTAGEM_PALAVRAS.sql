-- ========================================================================
-- SCRIPT: Adicionar campo de contagem de palavras
-- Data: 03/10/2025
-- Descrição: Adiciona campo contagem_palavras nas tabelas de redações
-- ========================================================================

-- Tabela: redacoes_enviadas
ALTER TABLE public.redacoes_enviadas
ADD COLUMN IF NOT EXISTS contagem_palavras INTEGER;

-- Tabela: redacoes_simulado (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_simulado') THEN
    ALTER TABLE public.redacoes_simulado
    ADD COLUMN IF NOT EXISTS contagem_palavras INTEGER;
  END IF;
END $$;

-- Tabela: redacoes_exercicio (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_exercicio') THEN
    ALTER TABLE public.redacoes_exercicio
    ADD COLUMN IF NOT EXISTS contagem_palavras INTEGER;
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN public.redacoes_enviadas.contagem_palavras IS
  'Número de palavras da redação digitada (gerado automaticamente no momento do envio)';

-- Verificar se foi aplicado com sucesso
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'redacoes_enviadas'
  AND column_name = 'contagem_palavras';
