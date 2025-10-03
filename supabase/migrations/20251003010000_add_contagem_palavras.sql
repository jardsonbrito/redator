-- Migration: Adicionar campo de contagem de palavras
-- Data: 2025-10-03
-- Descrição: Adiciona campo para armazenar contagem de palavras da redação digitada

-- Tabela: redacoes_enviadas
ALTER TABLE public.redacoes_enviadas
ADD COLUMN IF NOT EXISTS contagem_palavras INTEGER;

-- Tabela: redacoes_simulado
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_simulado') THEN
    ALTER TABLE public.redacoes_simulado
    ADD COLUMN IF NOT EXISTS contagem_palavras INTEGER;
  END IF;
END $$;

-- Tabela: redacoes_exercicio
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_exercicio') THEN
    ALTER TABLE public.redacoes_exercicio
    ADD COLUMN IF NOT EXISTS contagem_palavras INTEGER;
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN public.redacoes_enviadas.contagem_palavras IS
  'Número de palavras da redação digitada (gerado automaticamente no momento do envio)';
