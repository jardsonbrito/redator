-- ═══════════════════════════════════════════════════════════════
-- JARVIS - ALTERAR INTERACTIONS PARA SUPORTAR TUTORIA
-- Migration: 20260403000003
-- Descrição: Adiciona campos para rastrear interações de tutoria
--            sem quebrar o funcionamento dos modos simples
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Adicionar campos para tutoria ───────────────────────────
ALTER TABLE jarvis_interactions
ADD COLUMN IF NOT EXISTS subtab_nome TEXT,
ADD COLUMN IF NOT EXISTS etapa TEXT,
ADD COLUMN IF NOT EXISTS sessao_id UUID REFERENCES jarvis_tutoria_sessoes(id) ON DELETE SET NULL;

-- Comentários
COMMENT ON COLUMN jarvis_interactions.subtab_nome IS
  'Para modos interativos: qual subtab foi usada (introducao, desenvolvimento, conclusao)';

COMMENT ON COLUMN jarvis_interactions.etapa IS
  'Para modos interativos: qual etapa da tutoria (sugestoes, validacao, geracao)';

COMMENT ON COLUMN jarvis_interactions.sessao_id IS
  'Referência à sessão de tutoria (permite rastrear todas interações de uma sessão)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_jarvis_interactions_subtab ON jarvis_interactions(subtab_nome);
CREATE INDEX IF NOT EXISTS idx_jarvis_interactions_etapa ON jarvis_interactions(etapa);
CREATE INDEX IF NOT EXISTS idx_jarvis_interactions_sessao ON jarvis_interactions(sessao_id);

-- ─── 2. Verificar que modos simples não foram afetados ──────────
DO $$
DECLARE
  modo_simples_count INTEGER;
  interaction_count INTEGER;
BEGIN
  -- Contar modos simples
  SELECT COUNT(*) INTO modo_simples_count
  FROM jarvis_modos
  WHERE tipo_modo = 'simples' OR tipo_modo IS NULL;

  -- Contar interações existentes
  SELECT COUNT(*) INTO interaction_count
  FROM jarvis_interactions;

  RAISE NOTICE 'Modos simples: %, Interações existentes: %',
    modo_simples_count, interaction_count;

  -- Verificar que interações antigas não têm campos de tutoria preenchidos
  IF EXISTS (
    SELECT 1 FROM jarvis_interactions
    WHERE (subtab_nome IS NOT NULL OR etapa IS NOT NULL OR sessao_id IS NOT NULL)
    AND modo_id IN (SELECT id FROM jarvis_modos WHERE tipo_modo = 'simples')
  ) THEN
    RAISE WARNING 'ATENÇÃO: Interações de modos simples têm campos de tutoria preenchidos';
  END IF;

  RAISE NOTICE 'OK: Estrutura de interactions atualizada sem afetar modos simples';
END $$;

-- ─── Fim da migration ───────────────────────────────────────────
