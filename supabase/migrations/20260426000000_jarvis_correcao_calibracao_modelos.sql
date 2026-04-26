-- ═══════════════════════════════════════════════════════════════
-- JARVIS CORREÇÃO — Calibração Pedagógica + Modelos de Referência
-- Migration: 20260426000000
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. CALIBRAÇÃO PEDAGÓGICA na tabela de config
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE jarvis_correcao_config
ADD COLUMN IF NOT EXISTS calibracao_pedagogica TEXT;

COMMENT ON COLUMN jarvis_correcao_config.calibracao_pedagogica IS
  'Instruções pedagógicas detalhadas: critérios por competência, rigor, tom, limites de comentário, padrão de devolutiva';

-- ─────────────────────────────────────────────────────────────────
-- 2. MODELOS DE REFERÊNCIA para calibração por few-shot
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jarvis_correcao_modelos_referencia (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo         TEXT NOT NULL,
  tema           TEXT NOT NULL,
  texto_aluno    TEXT NOT NULL,
  nota_total     INTEGER NOT NULL CHECK (nota_total BETWEEN 0 AND 1000),
  nota_c1        INTEGER NOT NULL CHECK (nota_c1 BETWEEN 0 AND 200),
  nota_c2        INTEGER NOT NULL CHECK (nota_c2 BETWEEN 0 AND 200),
  nota_c3        INTEGER NOT NULL CHECK (nota_c3 BETWEEN 0 AND 200),
  nota_c4        INTEGER NOT NULL CHECK (nota_c4 BETWEEN 0 AND 200),
  nota_c5        INTEGER NOT NULL CHECK (nota_c5 BETWEEN 0 AND 200),
  justificativa_c1  TEXT,
  justificativa_c2  TEXT,
  justificativa_c3  TEXT,
  justificativa_c4  TEXT,
  justificativa_c5  TEXT,
  erros_identificados   TEXT,
  sugestoes_melhoria    TEXT,
  comentario_pedagogico TEXT,
  prioridade     INTEGER NOT NULL DEFAULT 0,
  ativo          BOOLEAN NOT NULL DEFAULT true,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por     UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modelos_referencia_ativo
  ON jarvis_correcao_modelos_referencia(ativo, prioridade DESC);
CREATE INDEX idx_modelos_referencia_criado
  ON jarvis_correcao_modelos_referencia(criado_em DESC);

ALTER TABLE jarvis_correcao_modelos_referencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam modelos de referência"
  ON jarvis_correcao_modelos_referencia FOR ALL
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid() AND ativo = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid() AND ativo = true
  ));

CREATE OR REPLACE FUNCTION update_modelos_referencia_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_modelos_referencia
  BEFORE UPDATE ON jarvis_correcao_modelos_referencia
  FOR EACH ROW EXECUTE FUNCTION update_modelos_referencia_updated_at();

COMMENT ON TABLE jarvis_correcao_modelos_referencia IS
  'Modelos de referência para calibração pedagógica da Correção IA (few-shot learning)';
