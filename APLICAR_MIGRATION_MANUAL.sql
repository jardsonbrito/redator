-- ============================================================
-- MIGRATION: Sistema de Conversão Texto → Imagem A4
-- Data: 02/10/2025
--
-- INSTRUÇÕES:
-- 1. Acesse o Supabase Dashboard do projeto
-- 2. Vá em "SQL Editor"
-- 3. Cole este SQL completo
-- 4. Clique em "Run" para executar
-- ============================================================

-- Tabela: redacoes_enviadas
ALTER TABLE public.redacoes_enviadas
ADD COLUMN IF NOT EXISTS tipo_redacao_original VARCHAR(20) DEFAULT 'digitada'
  CHECK (tipo_redacao_original IN ('digitada', 'manuscrita'));

ALTER TABLE public.redacoes_enviadas
ADD COLUMN IF NOT EXISTS redacao_imagem_gerada_url TEXT;

-- Comentários
COMMENT ON COLUMN public.redacoes_enviadas.tipo_redacao_original IS
  'Tipo original da redação: digitada (convertida para imagem) ou manuscrita (upload direto)';

COMMENT ON COLUMN public.redacoes_enviadas.redacao_imagem_gerada_url IS
  'URL da imagem A4 gerada automaticamente a partir do texto digitado';

-- Índice
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_tipo_original
  ON public.redacoes_enviadas(tipo_redacao_original);

-- Migrar dados existentes
UPDATE public.redacoes_enviadas
SET tipo_redacao_original = CASE
  WHEN redacao_manuscrita_url IS NOT NULL AND redacao_manuscrita_url != '' THEN 'manuscrita'
  ELSE 'digitada'
END
WHERE tipo_redacao_original IS NULL;

-- ============================================================
-- Tabela: redacoes_simulado (se existir)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_simulado') THEN

    ALTER TABLE public.redacoes_simulado
    ADD COLUMN IF NOT EXISTS tipo_redacao_original VARCHAR(20) DEFAULT 'digitada'
      CHECK (tipo_redacao_original IN ('digitada', 'manuscrita'));

    ALTER TABLE public.redacoes_simulado
    ADD COLUMN IF NOT EXISTS redacao_imagem_gerada_url TEXT;

    CREATE INDEX IF NOT EXISTS idx_redacoes_simulado_tipo_original
      ON public.redacoes_simulado(tipo_redacao_original);

    UPDATE public.redacoes_simulado
    SET tipo_redacao_original = CASE
      WHEN redacao_manuscrita_url IS NOT NULL AND redacao_manuscrita_url != '' THEN 'manuscrita'
      ELSE 'digitada'
    END
    WHERE tipo_redacao_original IS NULL;

  END IF;
END $$;

-- ============================================================
-- Tabela: redacoes_exercicio (se existir)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'redacoes_exercicio') THEN

    ALTER TABLE public.redacoes_exercicio
    ADD COLUMN IF NOT EXISTS tipo_redacao_original VARCHAR(20) DEFAULT 'digitada'
      CHECK (tipo_redacao_original IN ('digitada', 'manuscrita'));

    ALTER TABLE public.redacoes_exercicio
    ADD COLUMN IF NOT EXISTS redacao_imagem_gerada_url TEXT;

    CREATE INDEX IF NOT EXISTS idx_redacoes_exercicio_tipo_original
      ON public.redacoes_exercicio(tipo_redacao_original);

    UPDATE public.redacoes_exercicio
    SET tipo_redacao_original = CASE
      WHEN redacao_manuscrita_url IS NOT NULL AND redacao_manuscrita_url != '' THEN 'manuscrita'
      ELSE 'digitada'
    END
    WHERE tipo_redacao_original IS NULL;

  END IF;
END $$;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- Execute esta query para confirmar que os campos foram adicionados:
-- ============================================================

/*
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'redacoes_enviadas'
  AND column_name IN ('tipo_redacao_original', 'redacao_imagem_gerada_url')
ORDER BY column_name;
*/

-- ============================================================
-- FIM DA MIGRATION
-- Se executou sem erros, a implementação está completa!
-- ============================================================
