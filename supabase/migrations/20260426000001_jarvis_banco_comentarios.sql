-- ═══════════════════════════════════════════════════════════════
-- JARVIS CORREÇÃO — Banco de Comentários Pedagógicos
-- Migration: 20260426000001
-- Comentários pré-configurados por competência para serem
-- selecionados pela IA conforme a realidade do texto do aluno
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS jarvis_correcao_banco_comentarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia TEXT NOT NULL CHECK (competencia IN ('c1','c2','c3','c4','c5','geral')),
  categoria   TEXT,
  texto       TEXT NOT NULL,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  prioridade  INTEGER NOT NULL DEFAULT 0,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por  UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banco_comentarios_comp
  ON jarvis_correcao_banco_comentarios(competencia, ativo, prioridade DESC);

ALTER TABLE jarvis_correcao_banco_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam banco de comentários"
  ON jarvis_correcao_banco_comentarios FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND ativo = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND ativo = true));

CREATE OR REPLACE FUNCTION update_banco_comentarios_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_banco_comentarios
  BEFORE UPDATE ON jarvis_correcao_banco_comentarios
  FOR EACH ROW EXECUTE FUNCTION update_banco_comentarios_updated_at();

COMMENT ON TABLE jarvis_correcao_banco_comentarios IS
  'Banco de orientações pedagógicas por competência. A IA seleciona quais aplicar conforme o texto do aluno.';
COMMENT ON COLUMN jarvis_correcao_banco_comentarios.competencia IS
  'c1=Norma Padrão, c2=Temática/Repertório, c3=Argumentação, c4=Coesão, c5=Intervenção, geral=Orientações Gerais';
COMMENT ON COLUMN jarvis_correcao_banco_comentarios.categoria IS
  'Subcategoria opcional: ex. ortografia, concordância, repertório, coesão referencial...';
