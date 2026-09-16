-- Após adicionar calibracao_pedagogica em 20260426000000, a função
-- get_active_correcao_config() falha com type mismatch porque usa SELECT *
-- mas o RETURNS TABLE não incluía a nova coluna.
-- Fix: adicionar calibracao_pedagogica ao retorno e usar colunas explícitas.

DROP FUNCTION IF EXISTS get_active_correcao_config();

CREATE FUNCTION get_active_correcao_config()
RETURNS TABLE (
  id UUID,
  versao INTEGER,
  ativo BOOLEAN,
  nome TEXT,
  descricao TEXT,
  provider TEXT,
  model TEXT,
  temperatura DECIMAL(3,2),
  max_tokens INTEGER,
  system_prompt TEXT,
  user_prompt_template TEXT,
  response_schema JSONB,
  custo_creditos INTEGER,
  custo_estimado_usd DECIMAL(6,4),
  criado_por UUID,
  criado_em TIMESTAMPTZ,
  ativado_em TIMESTAMPTZ,
  ativado_por UUID,
  notas TEXT,
  calibracao_pedagogica TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, versao, ativo, nome, descricao, provider, model, temperatura,
    max_tokens, system_prompt, user_prompt_template, response_schema,
    custo_creditos, custo_estimado_usd, criado_por, criado_em,
    ativado_em, ativado_por, notas, calibracao_pedagogica
  FROM jarvis_correcao_config
  WHERE ativo = true
  LIMIT 1;
$$;
