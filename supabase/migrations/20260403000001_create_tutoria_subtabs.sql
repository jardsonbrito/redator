-- ═══════════════════════════════════════════════════════════════
-- JARVIS - TABELA DE SUBTABS DA TUTORIA
-- Migration: 20260403000001
-- Descrição: Cria tabela para gerenciar subtabs de modos interativos
--            (Introdução, Desenvolvimento, Conclusão)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Criar tabela de subtabs ─────────────────────────────────
CREATE TABLE jarvis_tutoria_subtabs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  modo_id         UUID        NOT NULL REFERENCES jarvis_modos(id) ON DELETE CASCADE,

  -- Identificação da subtab
  nome            TEXT        NOT NULL,  -- 'introducao', 'desenvolvimento', 'conclusao'
  label           TEXT        NOT NULL,  -- 'Introdução', 'Desenvolvimento', 'Conclusão'
  ordem           INTEGER     NOT NULL DEFAULT 0,

  -- Estado
  habilitada      BOOLEAN     NOT NULL DEFAULT false,

  -- Configuração da subtab (campos, instruções, etc)
  config          JSONB       NOT NULL DEFAULT '{}',

  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW(),

  -- Garantir que não haja subtabs duplicadas para o mesmo modo
  UNIQUE(modo_id, nome)
);

-- Índices
CREATE INDEX idx_tutoria_subtabs_modo ON jarvis_tutoria_subtabs(modo_id, ordem);
CREATE INDEX idx_tutoria_subtabs_habilitada ON jarvis_tutoria_subtabs(habilitada);

-- Comentários
COMMENT ON TABLE jarvis_tutoria_subtabs IS
  'Subtabs de modos interativos (ex: Introdução, Desenvolvimento, Conclusão da Tutoria)';

COMMENT ON COLUMN jarvis_tutoria_subtabs.nome IS
  'Identificador interno da subtab (slug)';

COMMENT ON COLUMN jarvis_tutoria_subtabs.label IS
  'Texto exibido ao aluno';

COMMENT ON COLUMN jarvis_tutoria_subtabs.habilitada IS
  'Se false, subtab aparece com cadeado e não é clicável';

COMMENT ON COLUMN jarvis_tutoria_subtabs.config IS
  'JSON com campos da subtab, instruções, prompts, etc';

-- ─── 2. RLS ─────────────────────────────────────────────────────
ALTER TABLE jarvis_tutoria_subtabs ENABLE ROW LEVEL SECURITY;

-- Alunos podem ver apenas subtabs habilitadas
CREATE POLICY "Public can view enabled subtabs"
  ON jarvis_tutoria_subtabs FOR SELECT
  TO public
  USING (habilitada = true);

-- Admins gerenciam todas as subtabs
CREATE POLICY "Admins manage all subtabs"
  ON jarvis_tutoria_subtabs FOR ALL
  TO authenticated
  USING (is_main_admin());

-- ─── 3. RPC para buscar subtabs de um modo ──────────────────────
CREATE OR REPLACE FUNCTION get_tutoria_subtabs(p_modo_id UUID)
RETURNS TABLE (
  id          UUID,
  nome        TEXT,
  label       TEXT,
  ordem       INTEGER,
  habilitada  BOOLEAN,
  config      JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.nome,
    s.label,
    s.ordem,
    s.habilitada,
    s.config
  FROM jarvis_tutoria_subtabs s
  WHERE s.modo_id = p_modo_id
  ORDER BY s.ordem ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tutoria_subtabs(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_tutoria_subtabs(UUID) TO authenticated;

COMMENT ON FUNCTION get_tutoria_subtabs IS
  'Retorna subtabs de um modo interativo, ordenadas. SECURITY DEFINER para alunos sem auth.';

-- ─── 4. RPC para alternar habilitação de subtab ─────────────────
CREATE OR REPLACE FUNCTION toggle_subtab_habilitada(
  p_subtab_id UUID,
  p_habilitada BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT is_main_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem habilitar/desabilitar subtabs';
  END IF;

  UPDATE jarvis_tutoria_subtabs
  SET habilitada = p_habilitada,
      atualizado_em = NOW()
  WHERE id = p_subtab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subtab não encontrada: %', p_subtab_id;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_subtab_habilitada(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION toggle_subtab_habilitada IS
  'Habilita ou desabilita uma subtab (apenas admins)';

-- ─── Fim da migration ───────────────────────────────────────────
