-- ═══════════════════════════════════════════════════════════════
-- JARVIS - ADICIONAR TIPO DE MODO (SIMPLES vs INTERATIVO)
-- Migration: 20260403000000
-- Descrição: Diferencia modos simples (atuais) de modos interativos (Tutoria)
--            Garante retrocompatibilidade total com modos existentes
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Adicionar coluna tipo_modo ──────────────────────────────
ALTER TABLE jarvis_modos
ADD COLUMN tipo_modo TEXT NOT NULL DEFAULT 'simples'
CHECK (tipo_modo IN ('simples', 'interativo'));

CREATE INDEX idx_jarvis_modos_tipo ON jarvis_modos(tipo_modo);

COMMENT ON COLUMN jarvis_modos.tipo_modo IS
  'Tipo de modo: simples (fluxo linear atual) ou interativo (tutoria com etapas)';

-- ─── 2. Adicionar configuração para modos interativos ───────────
-- Armazena configuração de prompts por etapa (apenas para modos interativos)
ALTER TABLE jarvis_modos
ADD COLUMN config_interativa JSONB DEFAULT NULL;

COMMENT ON COLUMN jarvis_modos.config_interativa IS
  'Configuração de modos interativos: prompts por etapa, etc. NULL para modos simples.';

-- ─── 3. Garantir que modos existentes sejam "simples" ───────────
-- Todos os modos já criados são automaticamente "simples" pelo DEFAULT
-- Apenas novos modos do tipo "interativo" terão tipo_modo = 'interativo'

-- Verificação: todos os modos atuais devem ser simples
DO $$
DECLARE
  modo_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO modo_count
  FROM jarvis_modos
  WHERE tipo_modo != 'simples';

  IF modo_count > 0 THEN
    RAISE EXCEPTION 'ERRO: Modos existentes não foram marcados como simples';
  END IF;

  RAISE NOTICE 'OK: Todos os modos existentes são do tipo simples';
END $$;

-- ─── Fim da migration ───────────────────────────────────────────
