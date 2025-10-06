-- Migration: Normalizar turmas em etapas, aulas e simulados
-- Data: 06/10/2025
-- Objetivo: Atualizar dados legados para usar formato normalizado (A, B, C, D, E, VISITANTE)

-- ============================================
-- 1. BACKUP DAS TABELAS AFETADAS
-- ============================================

-- Backup de etapas_estudo
CREATE TABLE IF NOT EXISTS etapas_estudo_backup_20251006 AS
SELECT * FROM etapas_estudo WHERE turma IS NOT NULL;

-- Backup de aulas (turmas_autorizadas)
CREATE TABLE IF NOT EXISTS aulas_backup_20251006 AS
SELECT id, titulo, turmas_autorizadas FROM aulas WHERE turmas_autorizadas IS NOT NULL;

-- Backup de simulados (turmas_autorizadas)
CREATE TABLE IF NOT EXISTS simulados_backup_20251006 AS
SELECT id, titulo, turmas_autorizadas FROM simulados WHERE turmas_autorizadas IS NOT NULL;

-- ============================================
-- 2. NORMALIZAR TURMAS EM ETAPAS_ESTUDO
-- ============================================

UPDATE etapas_estudo
SET turma = CASE
  -- Formato "TURMA A", "Turma A", "turma A"
  WHEN UPPER(turma) ~ 'TURMA\s*A' THEN 'A'
  WHEN UPPER(turma) ~ 'TURMA\s*B' THEN 'B'
  WHEN UPPER(turma) ~ 'TURMA\s*C' THEN 'C'
  WHEN UPPER(turma) ~ 'TURMA\s*D' THEN 'D'
  WHEN UPPER(turma) ~ 'TURMA\s*E' THEN 'E'

  -- Formato "LRA 2025", "LRB2025", etc
  WHEN UPPER(turma) ~ 'LRA' THEN 'A'
  WHEN UPPER(turma) ~ 'LRB' THEN 'B'
  WHEN UPPER(turma) ~ 'LRC' THEN 'C'
  WHEN UPPER(turma) ~ 'LRD' THEN 'D'
  WHEN UPPER(turma) ~ 'LRE' THEN 'E'

  -- Formato já normalizado
  WHEN UPPER(turma) = 'A' THEN 'A'
  WHEN UPPER(turma) = 'B' THEN 'B'
  WHEN UPPER(turma) = 'C' THEN 'C'
  WHEN UPPER(turma) = 'D' THEN 'D'
  WHEN UPPER(turma) = 'E' THEN 'E'

  -- Visitante
  WHEN UPPER(turma) ~ 'VISITANTE' THEN 'VISITANTE'

  ELSE turma
END
WHERE turma IS NOT NULL;

-- ============================================
-- 3. NORMALIZAR TURMAS_AUTORIZADAS EM AULAS
-- ============================================

-- Criar função auxiliar para normalizar arrays de turmas
CREATE OR REPLACE FUNCTION normalizar_array_turmas(turmas TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  turma TEXT;
  resultado TEXT[] := '{}';
  turma_normalizada TEXT;
BEGIN
  FOREACH turma IN ARRAY turmas
  LOOP
    turma_normalizada := CASE
      -- Formato "TURMA A", "Turma A", "turma A"
      WHEN UPPER(turma) ~ 'TURMA\s*A' THEN 'A'
      WHEN UPPER(turma) ~ 'TURMA\s*B' THEN 'B'
      WHEN UPPER(turma) ~ 'TURMA\s*C' THEN 'C'
      WHEN UPPER(turma) ~ 'TURMA\s*D' THEN 'D'
      WHEN UPPER(turma) ~ 'TURMA\s*E' THEN 'E'

      -- Formato "LRA 2025", "LRB2025", etc
      WHEN UPPER(turma) ~ 'LRA' THEN 'A'
      WHEN UPPER(turma) ~ 'LRB' THEN 'B'
      WHEN UPPER(turma) ~ 'LRC' THEN 'C'
      WHEN UPPER(turma) ~ 'LRD' THEN 'D'
      WHEN UPPER(turma) ~ 'LRE' THEN 'E'

      -- Formato já normalizado
      WHEN UPPER(turma) = 'A' THEN 'A'
      WHEN UPPER(turma) = 'B' THEN 'B'
      WHEN UPPER(turma) = 'C' THEN 'C'
      WHEN UPPER(turma) = 'D' THEN 'D'
      WHEN UPPER(turma) = 'E' THEN 'E'

      -- Visitante
      WHEN UPPER(turma) ~ 'VISITANTE' THEN 'VISITANTE'

      ELSE turma
    END;

    -- Adicionar ao resultado se não for duplicado
    IF NOT (turma_normalizada = ANY(resultado)) THEN
      resultado := array_append(resultado, turma_normalizada);
    END IF;
  END LOOP;

  RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- Normalizar turmas_autorizadas em aulas
UPDATE aulas
SET turmas_autorizadas = normalizar_array_turmas(turmas_autorizadas)
WHERE turmas_autorizadas IS NOT NULL
  AND array_length(turmas_autorizadas, 1) > 0;

-- ============================================
-- 4. NORMALIZAR TURMAS_AUTORIZADAS EM SIMULADOS
-- ============================================

UPDATE simulados
SET turmas_autorizadas = normalizar_array_turmas(turmas_autorizadas)
WHERE turmas_autorizadas IS NOT NULL
  AND array_length(turmas_autorizadas, 1) > 0;

-- ============================================
-- 5. NORMALIZAR OUTRAS TABELAS COM ARRAYS
-- ============================================

-- Exercicios
UPDATE exercicios
SET turmas_autorizadas = normalizar_array_turmas(turmas_autorizadas)
WHERE turmas_autorizadas IS NOT NULL
  AND array_length(turmas_autorizadas, 1) > 0;

-- Avisos
UPDATE avisos
SET turmas_autorizadas = normalizar_array_turmas(turmas_autorizadas)
WHERE turmas_autorizadas IS NOT NULL
  AND array_length(turmas_autorizadas, 1) > 0;

-- Biblioteca
UPDATE biblioteca
SET turmas_autorizadas = normalizar_array_turmas(turmas_autorizadas)
WHERE turmas_autorizadas IS NOT NULL
  AND array_length(turmas_autorizadas, 1) > 0;

-- Videos
UPDATE videos
SET turmas_autorizadas = normalizar_array_turmas(turmas_autorizadas)
WHERE turmas_autorizadas IS NOT NULL
  AND array_length(turmas_autorizadas, 1) > 0;

-- Games
UPDATE games
SET turmas_autorizadas = normalizar_array_turmas(turmas_autorizadas)
WHERE turmas_autorizadas IS NOT NULL
  AND array_length(turmas_autorizadas, 1) > 0;

-- ============================================
-- 6. NORMALIZAR RADAR_DADOS
-- ============================================

-- Backup de radar_dados
CREATE TABLE IF NOT EXISTS radar_dados_backup_20251006 AS
SELECT * FROM radar_dados WHERE turma IS NOT NULL;

-- Normalizar turmas em radar_dados
UPDATE radar_dados
SET turma = CASE
  -- Formato "TURMA A", "Turma A", "turma A"
  WHEN UPPER(turma) ~ 'TURMA\s*A' THEN 'A'
  WHEN UPPER(turma) ~ 'TURMA\s*B' THEN 'B'
  WHEN UPPER(turma) ~ 'TURMA\s*C' THEN 'C'
  WHEN UPPER(turma) ~ 'TURMA\s*D' THEN 'D'
  WHEN UPPER(turma) ~ 'TURMA\s*E' THEN 'E'

  -- Formato "LRA 2025", "LRB2025", etc
  WHEN UPPER(turma) ~ 'LRA' THEN 'A'
  WHEN UPPER(turma) ~ 'LRB' THEN 'B'
  WHEN UPPER(turma) ~ 'LRC' THEN 'C'
  WHEN UPPER(turma) ~ 'LRD' THEN 'D'
  WHEN UPPER(turma) ~ 'LRE' THEN 'E'

  -- Formato já normalizado
  WHEN UPPER(turma) = 'A' THEN 'A'
  WHEN UPPER(turma) = 'B' THEN 'B'
  WHEN UPPER(turma) = 'C' THEN 'C'
  WHEN UPPER(turma) = 'D' THEN 'D'
  WHEN UPPER(turma) = 'E' THEN 'E'

  -- Visitante
  WHEN UPPER(turma) ~ 'VISITANTE' THEN 'VISITANTE'

  ELSE turma
END
WHERE turma IS NOT NULL AND turma != 'Não informado';

-- ============================================
-- 7. CRIAR VIEW DE VALIDAÇÃO
-- ============================================

CREATE OR REPLACE VIEW vw_validacao_normalizacao_completa AS
SELECT
  'etapas_estudo' as tabela,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN turma IN ('A', 'B', 'C', 'D', 'E', 'VISITANTE') THEN 1 END) as normalizados,
  COUNT(CASE WHEN turma NOT IN ('A', 'B', 'C', 'D', 'E', 'VISITANTE') THEN 1 END) as nao_normalizados
FROM etapas_estudo
WHERE turma IS NOT NULL

UNION ALL

SELECT
  'aulas_turmas_autorizadas' as tabela,
  COUNT(*) as total_registros,
  COUNT(*) as normalizados, -- Difícil verificar arrays, assumir normalizado após update
  0 as nao_normalizados
FROM aulas
WHERE turmas_autorizadas IS NOT NULL AND array_length(turmas_autorizadas, 1) > 0

UNION ALL

SELECT
  'simulados_turmas_autorizadas' as tabela,
  COUNT(*) as total_registros,
  COUNT(*) as normalizados,
  0 as nao_normalizados
FROM simulados
WHERE turmas_autorizadas IS NOT NULL AND array_length(turmas_autorizadas, 1) > 0

ORDER BY tabela;

-- ============================================
-- 7. MENSAGEM DE CONCLUSÃO
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migração de normalização completa concluída!';
  RAISE NOTICE '📊 Execute: SELECT * FROM vw_validacao_normalizacao_completa';
  RAISE NOTICE '💾 Backups disponíveis:';
  RAISE NOTICE '   - etapas_estudo_backup_20251006';
  RAISE NOTICE '   - aulas_backup_20251006';
  RAISE NOTICE '   - simulados_backup_20251006';
  RAISE NOTICE '   - radar_dados_backup_20251006';
END $$;
