-- ═══════════════════════════════════════════════════════════════
-- JARVIS - CALIBRAÇÃO PEDAGÓGICA: DESENVOLVIMENTO E CONCLUSÃO
-- Migration: 20260509000000
-- Descrição: Adiciona campos específicos para configuração de
--            Desenvolvimento (célula argumentativa) e Conclusão
--            (proposta de intervenção + elementos C5)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Novos campos na tabela de calibração ────────────────────

ALTER TABLE jarvis_tutoria_calibracao
  ADD COLUMN IF NOT EXISTS criterios_celula_argumentativa JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS criterios_proposta_intervencao JSONB DEFAULT NULL;

COMMENT ON COLUMN jarvis_tutoria_calibracao.criterios_celula_argumentativa IS
  'Critérios da célula argumentativa para Desenvolvimento';

COMMENT ON COLUMN jarvis_tutoria_calibracao.criterios_proposta_intervencao IS
  'Critérios da proposta de intervenção e elementos C5 para Conclusão';

-- ─── 2. Defaults para subtabs existentes ────────────────────────

UPDATE jarvis_tutoria_calibracao
SET
  criterios_celula_argumentativa = jsonb_build_object(
    'elementos_obrigatorios', jsonb_build_array('topico_frasal', 'explicacao', 'embasamento'),
    'validar_topico_frasal', true,
    'validar_explicacao', true,
    'validar_embasamento', true,
    'validar_aplicacao_tema', true,
    'validar_causalidade', true,
    'validar_aprofundamento', false,
    'descricoes', jsonb_build_object(
      'topico_frasal', 'Sentença que apresenta o argumento central do parágrafo',
      'explicacao', 'Desenvolvimento e elucidação do argumento apresentado',
      'embasamento', 'Dado, citação ou exemplo que sustenta o argumento',
      'aplicacao_tema', 'Conexão explícita do argumento com o tema da redação',
      'causalidade', 'Relação de causa e efeito entre os elementos apresentados',
      'aprofundamento', 'Análise crítica ou reflexão aprofundada sobre o argumento'
    )
  ),
  periodos_exatos = 5,
  palavras_min = 100,
  palavras_max = 150,
  instrucoes_geracao = 'Construa um parágrafo de desenvolvimento com célula argumentativa completa: tópico frasal claro, explicação do argumento, embasamento com dado ou citação, aplicação explícita ao tema, relação de causalidade e aprofundamento crítico.'
WHERE subtab_id IN (SELECT id FROM jarvis_tutoria_subtabs WHERE nome = 'desenvolvimento')
  AND criterios_celula_argumentativa IS NULL;

UPDATE jarvis_tutoria_calibracao
SET
  criterios_proposta_intervencao = jsonb_build_object(
    'elementos_c5', jsonb_build_array('agente', 'acao', 'meio_modo', 'finalidade', 'detalhamento'),
    'elementos_obrigatorios', jsonb_build_array('agente', 'acao', 'finalidade'),
    'verificar_c5', true,
    'verificar_retomada_tese', true,
    'descricoes', jsonb_build_object(
      'agente', 'Entidade responsável por executar a proposta (governo, escola, família, mídia, etc.)',
      'acao', 'O que deve ser feito — verbo de ação claro e específico',
      'meio_modo', 'Como a ação será executada — instrumentos, métodos ou estratégias',
      'finalidade', 'Para que a ação será executada — objetivo final ou impacto esperado',
      'detalhamento', 'Especificação adicional que torna a proposta mais concreta e viável'
    )
  ),
  periodos_exatos = 3,
  palavras_min = 80,
  palavras_max = 120,
  instrucoes_geracao = 'Construa uma conclusão com proposta de intervenção nos moldes C5: agente responsável, ação a ser tomada, meio ou modo de execução, finalidade da proposta e detalhamento que a torne concreta. Retome a tese de forma sintética antes da proposta.'
WHERE subtab_id IN (SELECT id FROM jarvis_tutoria_subtabs WHERE nome = 'conclusao')
  AND criterios_proposta_intervencao IS NULL;

-- ─── 3. Recriar RPCs com novos campos ───────────────────────────

DROP FUNCTION IF EXISTS get_calibracao_by_subtab(UUID);

CREATE OR REPLACE FUNCTION get_calibracao_by_subtab(p_subtab_id UUID)
RETURNS TABLE (
  id                              UUID,
  subtab_id                       UUID,
  periodos_exatos                 INTEGER,
  palavras_min                    INTEGER,
  palavras_max                    INTEGER,
  linhas_max_estimadas            INTEGER,
  regras_composicao               JSONB,
  instrucoes_geracao              TEXT,
  validacao_automatica            BOOLEAN,
  max_tentativas_geracao          INTEGER,
  criterios_celula_argumentativa  JSONB,
  criterios_proposta_intervencao  JSONB
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
    c.max_tentativas_geracao,
    c.criterios_celula_argumentativa,
    c.criterios_proposta_intervencao
  FROM jarvis_tutoria_calibracao c
  WHERE c.subtab_id = p_subtab_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_calibracao_by_subtab(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_calibracao_by_subtab(UUID) TO authenticated;

DROP FUNCTION IF EXISTS upsert_calibracao(UUID, INTEGER, INTEGER, INTEGER, INTEGER, JSONB, TEXT, BOOLEAN, INTEGER);

CREATE OR REPLACE FUNCTION upsert_calibracao(
  p_subtab_id                       UUID,
  p_periodos_exatos                 INTEGER,
  p_palavras_min                    INTEGER,
  p_palavras_max                    INTEGER,
  p_linhas_max_estimadas            INTEGER DEFAULT NULL,
  p_regras_composicao               JSONB DEFAULT NULL,
  p_instrucoes_geracao              TEXT DEFAULT NULL,
  p_validacao_automatica            BOOLEAN DEFAULT true,
  p_max_tentativas_geracao          INTEGER DEFAULT 3,
  p_criterios_celula_argumentativa  JSONB DEFAULT NULL,
  p_criterios_proposta_intervencao  JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_main_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem configurar calibração';
  END IF;

  INSERT INTO jarvis_tutoria_calibracao (
    subtab_id, periodos_exatos, palavras_min, palavras_max, linhas_max_estimadas,
    regras_composicao, instrucoes_geracao, validacao_automatica, max_tentativas_geracao,
    criterios_celula_argumentativa, criterios_proposta_intervencao
  ) VALUES (
    p_subtab_id, p_periodos_exatos, p_palavras_min, p_palavras_max, p_linhas_max_estimadas,
    p_regras_composicao, p_instrucoes_geracao, p_validacao_automatica, p_max_tentativas_geracao,
    p_criterios_celula_argumentativa, p_criterios_proposta_intervencao
  )
  ON CONFLICT (subtab_id) DO UPDATE SET
    periodos_exatos                 = EXCLUDED.periodos_exatos,
    palavras_min                    = EXCLUDED.palavras_min,
    palavras_max                    = EXCLUDED.palavras_max,
    linhas_max_estimadas            = COALESCE(EXCLUDED.linhas_max_estimadas, jarvis_tutoria_calibracao.linhas_max_estimadas),
    regras_composicao               = COALESCE(EXCLUDED.regras_composicao, jarvis_tutoria_calibracao.regras_composicao),
    instrucoes_geracao              = COALESCE(EXCLUDED.instrucoes_geracao, jarvis_tutoria_calibracao.instrucoes_geracao),
    validacao_automatica            = EXCLUDED.validacao_automatica,
    max_tentativas_geracao          = EXCLUDED.max_tentativas_geracao,
    criterios_celula_argumentativa  = COALESCE(EXCLUDED.criterios_celula_argumentativa, jarvis_tutoria_calibracao.criterios_celula_argumentativa),
    criterios_proposta_intervencao  = COALESCE(EXCLUDED.criterios_proposta_intervencao, jarvis_tutoria_calibracao.criterios_proposta_intervencao),
    atualizado_em                   = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_calibracao(UUID, INTEGER, INTEGER, INTEGER, INTEGER, JSONB, TEXT, BOOLEAN, INTEGER, JSONB, JSONB) TO authenticated;

-- ─── Fim da migration ────────────────────────────────────────────
