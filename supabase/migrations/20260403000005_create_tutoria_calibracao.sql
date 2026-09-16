-- ═══════════════════════════════════════════════════════════════
-- JARVIS - CALIBRAÇÃO PEDAGÓGICA DA TUTORIA
-- Migration: 20260403000005
-- Descrição: Permite configurar parâmetros estruturais e regras
--            de composição para calibrar a geração do Jarvis
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Tabela de calibração ────────────────────────────────────
CREATE TABLE jarvis_tutoria_calibracao (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subtab_id             UUID        NOT NULL REFERENCES jarvis_tutoria_subtabs(id) ON DELETE CASCADE,

  -- PARÂMETROS ESTRUTURAIS
  periodos_exatos       INTEGER     NOT NULL DEFAULT 3,
  palavras_min          INTEGER     DEFAULT 80,
  palavras_max          INTEGER     DEFAULT 120,
  linhas_max_estimadas  INTEGER     DEFAULT 7,

  -- REGRAS DE COMPOSIÇÃO (JSON)
  regras_composicao     JSONB       DEFAULT jsonb_build_object(
    'estrutura_obrigatoria', jsonb_build_array(
      'repertorio_interpretacao',
      'contextualizacao_brasil',
      'tese_causal'
    ),
    'coesivos_sugeridos', jsonb_build_array(
      'Segundo',
      'Nesse contexto',
      'Diante disso',
      'Portanto',
      'Dessa forma'
    ),
    'nivel_concisao', 'alto',
    'tom', 'formal_academico',
    'restricoes', jsonb_build_array(
      'Evitar orações muito longas',
      'Preferir coordenação à subordinação excessiva',
      'Tese deve mencionar explicitamente os 2 aspectos causais'
    )
  ),

  -- INSTRUÇÕES ADICIONAIS PARA O PROMPT
  instrucoes_geracao    TEXT        DEFAULT 'Use sintaxe concisa. Prefira períodos compostos coordenados. A tese deve integrar os dois aspectos causais de forma clara e coesa.',

  -- CONTROLE DE VALIDAÇÃO AUTOMÁTICA
  validacao_automatica  BOOLEAN     DEFAULT true,
  max_tentativas_geracao INTEGER    DEFAULT 3,

  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(subtab_id)
);

CREATE INDEX idx_calibracao_subtab ON jarvis_tutoria_calibracao(subtab_id);

COMMENT ON TABLE jarvis_tutoria_calibracao IS
  'Parâmetros de calibração pedagógica para geração de textos na tutoria';

COMMENT ON COLUMN jarvis_tutoria_calibracao.periodos_exatos IS
  'Número EXATO de períodos que o texto deve ter (ex: introdução ENEM = 3)';

COMMENT ON COLUMN jarvis_tutoria_calibracao.palavras_min IS
  'Mínimo de palavras permitido';

COMMENT ON COLUMN jarvis_tutoria_calibracao.palavras_max IS
  'Máximo de palavras permitido (ex: ENEM 30 linhas → introdução ~120 palavras)';

COMMENT ON COLUMN jarvis_tutoria_calibracao.instrucoes_geracao IS
  'Instruções adicionais enviadas ao prompt da IA para calibrar estilo e estrutura';

-- ─── 2. RLS ─────────────────────────────────────────────────────
ALTER TABLE jarvis_tutoria_calibracao ENABLE ROW LEVEL SECURITY;

-- Public pode ler (necessário para edge functions)
CREATE POLICY "Public can read calibracao"
  ON jarvis_tutoria_calibracao FOR SELECT
  TO public
  USING (true);

-- Admins gerenciam
CREATE POLICY "Admins manage calibracao"
  ON jarvis_tutoria_calibracao FOR ALL
  TO authenticated
  USING (is_main_admin());

-- ─── 3. RPCs de gerenciamento ───────────────────────────────────

-- Buscar calibração de uma subtab
CREATE OR REPLACE FUNCTION get_calibracao_by_subtab(p_subtab_id UUID)
RETURNS TABLE (
  id                    UUID,
  subtab_id             UUID,
  periodos_exatos       INTEGER,
  palavras_min          INTEGER,
  palavras_max          INTEGER,
  linhas_max_estimadas  INTEGER,
  regras_composicao     JSONB,
  instrucoes_geracao    TEXT,
  validacao_automatica  BOOLEAN,
  max_tentativas_geracao INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.subtab_id,
    c.periodos_exatos,
    c.palavras_min,
    c.palavras_max,
    c.linhas_max_estimadas,
    c.regras_composicao,
    c.instrucoes_geracao,
    c.validacao_automatica,
    c.max_tentativas_geracao
  FROM jarvis_tutoria_calibracao c
  WHERE c.subtab_id = p_subtab_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_calibracao_by_subtab(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_calibracao_by_subtab(UUID) TO authenticated;

-- Criar ou atualizar calibração
CREATE OR REPLACE FUNCTION upsert_calibracao(
  p_subtab_id UUID,
  p_periodos_exatos INTEGER,
  p_palavras_min INTEGER,
  p_palavras_max INTEGER,
  p_linhas_max_estimadas INTEGER DEFAULT NULL,
  p_regras_composicao JSONB DEFAULT NULL,
  p_instrucoes_geracao TEXT DEFAULT NULL,
  p_validacao_automatica BOOLEAN DEFAULT true,
  p_max_tentativas_geracao INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Verificar se usuário é admin
  IF NOT is_main_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem configurar calibração';
  END IF;

  INSERT INTO jarvis_tutoria_calibracao (
    subtab_id,
    periodos_exatos,
    palavras_min,
    palavras_max,
    linhas_max_estimadas,
    regras_composicao,
    instrucoes_geracao,
    validacao_automatica,
    max_tentativas_geracao
  ) VALUES (
    p_subtab_id,
    p_periodos_exatos,
    p_palavras_min,
    p_palavras_max,
    p_linhas_max_estimadas,
    p_regras_composicao,
    p_instrucoes_geracao,
    p_validacao_automatica,
    p_max_tentativas_geracao
  )
  ON CONFLICT (subtab_id) DO UPDATE SET
    periodos_exatos = EXCLUDED.periodos_exatos,
    palavras_min = EXCLUDED.palavras_min,
    palavras_max = EXCLUDED.palavras_max,
    linhas_max_estimadas = COALESCE(EXCLUDED.linhas_max_estimadas, jarvis_tutoria_calibracao.linhas_max_estimadas),
    regras_composicao = COALESCE(EXCLUDED.regras_composicao, jarvis_tutoria_calibracao.regras_composicao),
    instrucoes_geracao = COALESCE(EXCLUDED.instrucoes_geracao, jarvis_tutoria_calibracao.instrucoes_geracao),
    validacao_automatica = EXCLUDED.validacao_automatica,
    max_tentativas_geracao = EXCLUDED.max_tentativas_geracao,
    atualizado_em = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_calibracao(UUID, INTEGER, INTEGER, INTEGER, INTEGER, JSONB, TEXT, BOOLEAN, INTEGER) TO authenticated;

COMMENT ON FUNCTION upsert_calibracao IS
  'Cria ou atualiza calibração de uma subtab (apenas admins)';

-- ─── Fim da migration ───────────────────────────────────────────
