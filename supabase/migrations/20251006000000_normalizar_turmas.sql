-- Migration: Normalização de Turmas
-- Data: 2025-10-06
-- Objetivo: Padronizar valores de turma para letras únicas (A-E) ou VISITANTE
--
-- ANTES: "TURMA A", "Turma A", "LRA 2025", etc.
-- DEPOIS: "A", "B", "C", "D", "E", "VISITANTE"

-- ============================================================================
-- FASE 1: BACKUP DE SEGURANÇA
-- ============================================================================

-- Criar tabela de backup com valores únicos de turma antes da migração
CREATE TABLE IF NOT EXISTS turmas_backup_20251006 (
  turma_original TEXT PRIMARY KEY,
  turma_normalizada TEXT,
  quantidade_registros INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registrar valores únicos de turma em profiles
INSERT INTO turmas_backup_20251006 (turma_original, turma_normalizada, quantidade_registros)
SELECT
  turma as turma_original,
  CASE
    WHEN UPPER(turma) ~ 'TURMA\s*A|^LRA' THEN 'A'
    WHEN UPPER(turma) ~ 'TURMA\s*B|^LRB' THEN 'B'
    WHEN UPPER(turma) ~ 'TURMA\s*C|^LRC' THEN 'C'
    WHEN UPPER(turma) ~ 'TURMA\s*D|^LRD' THEN 'D'
    WHEN UPPER(turma) ~ 'TURMA\s*E|^LRE' THEN 'E'
    WHEN UPPER(TRIM(turma)) = 'VISITANTE' THEN 'VISITANTE'
    WHEN turma ~ '^[A-E]$' THEN turma
    ELSE turma
  END as turma_normalizada,
  COUNT(*) as quantidade_registros
FROM profiles
WHERE turma IS NOT NULL AND turma != ''
GROUP BY turma
ON CONFLICT (turma_original) DO NOTHING;

-- Registrar valores únicos de turma em redacoes_enviadas
INSERT INTO turmas_backup_20251006 (turma_original, turma_normalizada, quantidade_registros)
SELECT
  turma as turma_original,
  CASE
    WHEN UPPER(turma) ~ 'TURMA\s*A|^LRA' THEN 'A'
    WHEN UPPER(turma) ~ 'TURMA\s*B|^LRB' THEN 'B'
    WHEN UPPER(turma) ~ 'TURMA\s*C|^LRC' THEN 'C'
    WHEN UPPER(turma) ~ 'TURMA\s*D|^LRD' THEN 'D'
    WHEN UPPER(turma) ~ 'TURMA\s*E|^LRE' THEN 'E'
    WHEN UPPER(TRIM(turma)) = 'VISITANTE' THEN 'VISITANTE'
    WHEN turma ~ '^[A-E]$' THEN turma
    ELSE turma
  END as turma_normalizada,
  COUNT(*) as quantidade_registros
FROM redacoes_enviadas
WHERE turma IS NOT NULL AND turma != ''
GROUP BY turma
ON CONFLICT (turma_original)
DO UPDATE SET quantidade_registros = turmas_backup_20251006.quantidade_registros + EXCLUDED.quantidade_registros;

-- ============================================================================
-- FASE 2: NORMALIZAÇÃO DE DADOS
-- ============================================================================

-- 2.1 Normalizar tabela profiles
UPDATE profiles
SET turma = CASE
  -- Formato "TURMA X" (case insensitive)
  WHEN UPPER(turma) ~ 'TURMA\s*A' THEN 'A'
  WHEN UPPER(turma) ~ 'TURMA\s*B' THEN 'B'
  WHEN UPPER(turma) ~ 'TURMA\s*C' THEN 'C'
  WHEN UPPER(turma) ~ 'TURMA\s*D' THEN 'D'
  WHEN UPPER(turma) ~ 'TURMA\s*E' THEN 'E'

  -- Formato legado "LRX 2025" ou "LRX"
  WHEN UPPER(turma) ~ '^LRA' THEN 'A'
  WHEN UPPER(turma) ~ '^LRB' THEN 'B'
  WHEN UPPER(turma) ~ '^LRC' THEN 'C'
  WHEN UPPER(turma) ~ '^LRD' THEN 'D'
  WHEN UPPER(turma) ~ '^LRE' THEN 'E'

  -- Visitante
  WHEN UPPER(TRIM(turma)) = 'VISITANTE' THEN 'VISITANTE'

  -- Já está normalizado (letra única A-E)
  WHEN turma ~ '^[A-E]$' THEN turma

  -- Fallback: manter valor original se não reconhecido
  ELSE turma
END
WHERE turma IS NOT NULL AND turma != '';

-- 2.2 Normalizar tabela redacoes_enviadas
UPDATE redacoes_enviadas
SET turma = CASE
  WHEN UPPER(turma) ~ 'TURMA\s*A' THEN 'A'
  WHEN UPPER(turma) ~ 'TURMA\s*B' THEN 'B'
  WHEN UPPER(turma) ~ 'TURMA\s*C' THEN 'C'
  WHEN UPPER(turma) ~ 'TURMA\s*D' THEN 'D'
  WHEN UPPER(turma) ~ 'TURMA\s*E' THEN 'E'
  WHEN UPPER(turma) ~ '^LRA' THEN 'A'
  WHEN UPPER(turma) ~ '^LRB' THEN 'B'
  WHEN UPPER(turma) ~ '^LRC' THEN 'C'
  WHEN UPPER(turma) ~ '^LRD' THEN 'D'
  WHEN UPPER(turma) ~ '^LRE' THEN 'E'
  WHEN UPPER(TRIM(turma)) = 'VISITANTE' THEN 'VISITANTE'
  WHEN turma ~ '^[A-E]$' THEN turma
  ELSE turma
END
WHERE turma IS NOT NULL AND turma != '';

-- 2.3 Normalizar outras tabelas relevantes

-- Tabela aulas (se existir coluna turmas_autorizadas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aulas' AND column_name = 'turmas_autorizadas'
  ) THEN
    UPDATE aulas
    SET turmas_autorizadas = ARRAY(
      SELECT CASE
        WHEN UPPER(turma_elem) ~ 'TURMA\s*A' OR UPPER(turma_elem) ~ '^LRA' THEN 'A'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*B' OR UPPER(turma_elem) ~ '^LRB' THEN 'B'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*C' OR UPPER(turma_elem) ~ '^LRC' THEN 'C'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*D' OR UPPER(turma_elem) ~ '^LRD' THEN 'D'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*E' OR UPPER(turma_elem) ~ '^LRE' THEN 'E'
        WHEN UPPER(TRIM(turma_elem)) = 'VISITANTE' THEN 'VISITANTE'
        WHEN turma_elem ~ '^[A-E]$' THEN turma_elem
        ELSE turma_elem
      END
      FROM UNNEST(turmas_autorizadas) AS turma_elem
    )
    WHERE turmas_autorizadas IS NOT NULL AND array_length(turmas_autorizadas, 1) > 0;
  END IF;
END $$;

-- Tabela temas (se existir coluna turmas_autorizadas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temas' AND column_name = 'turmas_autorizadas'
  ) THEN
    UPDATE temas
    SET turmas_autorizadas = ARRAY(
      SELECT CASE
        WHEN UPPER(turma_elem) ~ 'TURMA\s*A' OR UPPER(turma_elem) ~ '^LRA' THEN 'A'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*B' OR UPPER(turma_elem) ~ '^LRB' THEN 'B'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*C' OR UPPER(turma_elem) ~ '^LRC' THEN 'C'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*D' OR UPPER(turma_elem) ~ '^LRD' THEN 'D'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*E' OR UPPER(turma_elem) ~ '^LRE' THEN 'E'
        WHEN UPPER(TRIM(turma_elem)) = 'VISITANTE' THEN 'VISITANTE'
        WHEN turma_elem ~ '^[A-E]$' THEN turma_elem
        ELSE turma_elem
      END
      FROM UNNEST(turmas_autorizadas) AS turma_elem
    )
    WHERE turmas_autorizadas IS NOT NULL AND array_length(turmas_autorizadas, 1) > 0;
  END IF;
END $$;

-- Tabela exercicios (se existir coluna turmas_autorizadas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercicios' AND column_name = 'turmas_autorizadas'
  ) THEN
    UPDATE exercicios
    SET turmas_autorizadas = ARRAY(
      SELECT CASE
        WHEN UPPER(turma_elem) ~ 'TURMA\s*A' OR UPPER(turma_elem) ~ '^LRA' THEN 'A'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*B' OR UPPER(turma_elem) ~ '^LRB' THEN 'B'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*C' OR UPPER(turma_elem) ~ '^LRC' THEN 'C'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*D' OR UPPER(turma_elem) ~ '^LRD' THEN 'D'
        WHEN UPPER(turma_elem) ~ 'TURMA\s*E' OR UPPER(turma_elem) ~ '^LRE' THEN 'E'
        WHEN UPPER(TRIM(turma_elem)) = 'VISITANTE' THEN 'VISITANTE'
        WHEN turma_elem ~ '^[A-E]$' THEN turma_elem
        ELSE turma_elem
      END
      FROM UNNEST(turmas_autorizadas) AS turma_elem
    )
    WHERE turmas_autorizadas IS NOT NULL AND array_length(turmas_autorizadas, 1) > 0;
  END IF;
END $$;

-- Tabela avaliacoes_presenciais (se existir coluna turma)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'avaliacoes_presenciais' AND column_name = 'turma'
  ) THEN
    UPDATE avaliacoes_presenciais
    SET turma = CASE
      WHEN UPPER(turma) ~ 'TURMA\s*A' THEN 'A'
      WHEN UPPER(turma) ~ 'TURMA\s*B' THEN 'B'
      WHEN UPPER(turma) ~ 'TURMA\s*C' THEN 'C'
      WHEN UPPER(turma) ~ 'TURMA\s*D' THEN 'D'
      WHEN UPPER(turma) ~ 'TURMA\s*E' THEN 'E'
      WHEN UPPER(turma) ~ '^LRA' THEN 'A'
      WHEN UPPER(turma) ~ '^LRB' THEN 'B'
      WHEN UPPER(turma) ~ '^LRC' THEN 'C'
      WHEN UPPER(turma) ~ '^LRD' THEN 'D'
      WHEN UPPER(turma) ~ '^LRE' THEN 'E'
      WHEN turma ~ '^[A-E]$' THEN turma
      ELSE turma
    END
    WHERE turma IS NOT NULL AND turma != '';
  END IF;
END $$;

-- ============================================================================
-- FASE 3: VALIDAÇÃO E CONSTRAINTS
-- ============================================================================

-- Remover constraint antigo se existir
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_turma_check;

-- Adicionar constraint para garantir valores válidos
ALTER TABLE profiles
ADD CONSTRAINT valid_turma_check
CHECK (
  turma IS NULL
  OR turma = ''
  OR turma IN ('A', 'B', 'C', 'D', 'E', 'VISITANTE')
);

-- Comentários para documentação
COMMENT ON CONSTRAINT valid_turma_check ON profiles IS
'Garante que turmas são apenas letras A-E ou VISITANTE (padrão desde 2025-10-06)';

COMMENT ON TABLE turmas_backup_20251006 IS
'Backup de valores de turma antes da normalização de 2025-10-06. Manter para auditoria.';

-- ============================================================================
-- FASE 4: RELATÓRIO DE MIGRAÇÃO
-- ============================================================================

-- Criar view temporária para análise pós-migração
CREATE OR REPLACE VIEW vw_relatorio_normalizacao_turmas AS
SELECT
  'profiles' as tabela,
  turma,
  COUNT(*) as quantidade
FROM profiles
WHERE turma IS NOT NULL AND turma != ''
GROUP BY turma

UNION ALL

SELECT
  'redacoes_enviadas' as tabela,
  turma,
  COUNT(*) as quantidade
FROM redacoes_enviadas
WHERE turma IS NOT NULL AND turma != ''
GROUP BY turma

ORDER BY tabela, turma;

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migração de normalização de turmas concluída com sucesso!';
  RAISE NOTICE '📊 Consulte vw_relatorio_normalizacao_turmas para ver resultados';
  RAISE NOTICE '💾 Backup disponível em turmas_backup_20251006';
END $$;
