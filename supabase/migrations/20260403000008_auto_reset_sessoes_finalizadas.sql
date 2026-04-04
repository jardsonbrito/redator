-- ═══════════════════════════════════════════════════════════════
-- JARVIS - AUTO-RESET DE SESSÕES FINALIZADAS
-- Migration: 20260403000008
-- Descrição: Modifica get_or_create_tutoria_sessao para resetar
--            automaticamente sessões finalizadas quando o aluno
--            retorna, garantindo um novo fluxo limpo
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_or_create_tutoria_sessao(
  p_email TEXT,
  p_modo_id UUID,
  p_subtab_nome TEXT
)
RETURNS TABLE (
  id                    UUID,
  etapa_atual           TEXT,
  dados_preenchidos     JSONB,
  dados_sugeridos       JSONB,
  validacao_resultado   JSONB,
  texto_gerado          TEXT,
  engenharia_paragrafo  JSONB,
  finalizado            BOOLEAN,
  creditos_consumidos   INTEGER,
  criado_em             TIMESTAMPTZ,
  atualizado_em         TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_sessao_id UUID;
  v_sessao_finalizada BOOLEAN;
BEGIN
  -- Buscar user_id pelo email
  SELECT pr.id INTO v_user_id
  FROM profiles pr
  WHERE pr.email = LOWER(TRIM(p_email))
    AND pr.user_type = 'aluno'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', p_email;
  END IF;

  -- Buscar sessão existente
  SELECT s.id, s.finalizado INTO v_sessao_id, v_sessao_finalizada
  FROM jarvis_tutoria_sessoes s
  WHERE s.user_id = v_user_id
    AND s.modo_id = p_modo_id
    AND s.subtab_nome = p_subtab_nome;

  -- Se existe E está finalizada, resetá-la
  IF v_sessao_id IS NOT NULL AND v_sessao_finalizada = true THEN
    UPDATE jarvis_tutoria_sessoes
    SET
      etapa_atual = 'preenchimento',
      dados_preenchidos = '{}'::jsonb,
      dados_sugeridos = '{}'::jsonb,
      validacao_resultado = NULL,
      texto_gerado = NULL,
      engenharia_paragrafo = NULL,
      finalizado = false,
      creditos_consumidos = 0,
      atualizado_em = NOW()
    WHERE id = v_sessao_id;

  -- Se não existe, criar nova (com proteção contra race condition)
  ELSIF v_sessao_id IS NULL THEN
    INSERT INTO jarvis_tutoria_sessoes (user_id, modo_id, subtab_nome, etapa_atual)
    VALUES (v_user_id, p_modo_id, p_subtab_nome, 'preenchimento')
    ON CONFLICT (user_id, modo_id, subtab_nome) DO NOTHING
    RETURNING jarvis_tutoria_sessoes.id INTO v_sessao_id;

    -- Se houve conflito, buscar a sessão existente
    IF v_sessao_id IS NULL THEN
      SELECT jts.id INTO v_sessao_id
      FROM jarvis_tutoria_sessoes jts
      WHERE jts.user_id = v_user_id
        AND jts.modo_id = p_modo_id
        AND jts.subtab_nome = p_subtab_nome;
    END IF;
  END IF;

  -- Retornar sessão (resetada ou existente não-finalizada ou nova)
  RETURN QUERY
  SELECT
    jts.id AS id,
    jts.etapa_atual AS etapa_atual,
    jts.dados_preenchidos AS dados_preenchidos,
    jts.dados_sugeridos AS dados_sugeridos,
    jts.validacao_resultado AS validacao_resultado,
    jts.texto_gerado AS texto_gerado,
    jts.engenharia_paragrafo AS engenharia_paragrafo,
    jts.finalizado AS finalizado,
    jts.creditos_consumidos AS creditos_consumidos,
    jts.criado_em AS criado_em,
    jts.atualizado_em AS atualizado_em
  FROM jarvis_tutoria_sessoes AS jts
  WHERE jts.id = v_sessao_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_tutoria_sessao IS
  'Busca sessão ativa ou cria nova. Se sessão existir E estiver finalizada, reseta automaticamente. SECURITY DEFINER para alunos sem auth.';

-- ─── Fim da migration ───────────────────────────────────────────
