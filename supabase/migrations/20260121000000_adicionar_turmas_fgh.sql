-- ============================================================================
-- MIGRATION: Adicionar Turmas F, G, H ao sistema
-- Data: 2026-01-21
-- Descrição: Expande o sistema de turmas de A-E para A-H
-- ============================================================================

-- ============================================================================
-- FASE 1: ATUALIZAR CONSTRAINT EM PROFILES
-- ============================================================================

-- Remover constraint antigo
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_turma_check;

-- Adicionar constraint atualizado com turmas F, G, H
ALTER TABLE profiles
ADD CONSTRAINT valid_turma_check
CHECK (
  turma IS NULL
  OR turma = ''
  OR turma IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'VISITANTE')
);

-- Atualizar comentário do constraint
COMMENT ON CONSTRAINT valid_turma_check ON profiles IS
'Garante que turmas são apenas letras A-H ou VISITANTE (atualizado em 2026-01-21)';

-- ============================================================================
-- FASE 2: ATUALIZAR ARRAYS DE TURMAS EM OUTRAS TABELAS (se houver constraints)
-- ============================================================================

-- Função auxiliar para validar arrays de turmas (atualizada)
CREATE OR REPLACE FUNCTION validate_turmas_array(turmas text[])
RETURNS boolean AS $$
DECLARE
  turma_elem text;
BEGIN
  IF turmas IS NULL THEN
    RETURN true;
  END IF;

  FOREACH turma_elem IN ARRAY turmas
  LOOP
    IF turma_elem NOT IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'VISITANTE') THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comentário da função
COMMENT ON FUNCTION validate_turmas_array(text[]) IS
'Valida arrays de turmas. Aceita A-H e VISITANTE (atualizado em 2026-01-21)';

-- ============================================================================
-- FASE 3: LOG DA MIGRAÇÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20260121000000_adicionar_turmas_fgh concluída com sucesso';
  RAISE NOTICE 'Turmas válidas agora: A, B, C, D, E, F, G, H, VISITANTE';
END $$;
