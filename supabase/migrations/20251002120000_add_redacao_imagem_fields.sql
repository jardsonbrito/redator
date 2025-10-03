-- Migration: Adicionar campos para sistema de conversão texto → imagem A4
-- Data: 2025-10-02
-- Descrição: Adiciona campos para armazenar tipo original da redação e URL da imagem gerada

-- Adicionar campos na tabela redacoes_enviadas
ALTER TABLE public.redacoes_enviadas
ADD COLUMN IF NOT EXISTS tipo_redacao_original VARCHAR(20) DEFAULT 'digitada'
  CHECK (tipo_redacao_original IN ('digitada', 'manuscrita')),
ADD COLUMN IF NOT EXISTS redacao_imagem_gerada_url TEXT;

-- Adicionar campos na tabela redacoes_simulado (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_simulado') THEN
    ALTER TABLE public.redacoes_simulado
    ADD COLUMN IF NOT EXISTS tipo_redacao_original VARCHAR(20) DEFAULT 'digitada'
      CHECK (tipo_redacao_original IN ('digitada', 'manuscrita')),
    ADD COLUMN IF NOT EXISTS redacao_imagem_gerada_url TEXT;
  END IF;
END $$;

-- Adicionar campos na tabela redacoes_exercicio (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_exercicio') THEN
    ALTER TABLE public.redacoes_exercicio
    ADD COLUMN IF NOT EXISTS tipo_redacao_original VARCHAR(20) DEFAULT 'digitada'
      CHECK (tipo_redacao_original IN ('digitada', 'manuscrita')),
    ADD COLUMN IF NOT EXISTS redacao_imagem_gerada_url TEXT;
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN public.redacoes_enviadas.tipo_redacao_original IS
  'Tipo original da redação: digitada (convertida para imagem) ou manuscrita (upload direto)';

COMMENT ON COLUMN public.redacoes_enviadas.redacao_imagem_gerada_url IS
  'URL da imagem A4 gerada automaticamente a partir do texto digitado';

-- Índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_tipo_original
  ON public.redacoes_enviadas(tipo_redacao_original);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_simulado') THEN
    CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_tipo_original
      ON public.redacoes_simulado(tipo_redacao_original);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_exercicio') THEN
    CREATE INDEX IF NOT EXISTS idx_redacoes_exercicio_tipo_original
      ON public.redacoes_exercicio(tipo_redacao_original);
  END IF;
END $$;

-- Migrar dados existentes: definir tipo_redacao_original baseado em redacao_manuscrita_url
UPDATE public.redacoes_enviadas
SET tipo_redacao_original = CASE
  WHEN redacao_manuscrita_url IS NOT NULL AND redacao_manuscrita_url != '' THEN 'manuscrita'
  ELSE 'digitada'
END
WHERE tipo_redacao_original IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_simulado') THEN
    UPDATE public.redacoes_simulado
    SET tipo_redacao_original = CASE
      WHEN redacao_manuscrita_url IS NOT NULL AND redacao_manuscrita_url != '' THEN 'manuscrita'
      ELSE 'digitada'
    END
    WHERE tipo_redacao_original IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_exercicio') THEN
    UPDATE public.redacoes_exercicio
    SET tipo_redacao_original = CASE
      WHEN redacao_manuscrita_url IS NOT NULL AND redacao_manuscrita_url != '' THEN 'manuscrita'
      ELSE 'digitada'
    END
    WHERE tipo_redacao_original IS NULL;
  END IF;
END $$;
