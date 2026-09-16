-- ═════════════════════════════════════════════════════════════════════════
-- FILTRAR HISTÓRICO: Apenas gerações finais, sem etapas intermediárias
-- ═════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_jarvis_historico_by_email(TEXT);

CREATE OR REPLACE FUNCTION get_jarvis_historico_by_email(p_email TEXT)
RETURNS TABLE (
  id                  UUID,
  texto_original      TEXT,
  diagnostico         TEXT,
  sugestao_reescrita  TEXT,
  versao_melhorada    TEXT,
  resposta_json       JSONB,
  palavras_original   INTEGER,
  palavras_melhorada  INTEGER,
  modo_id             UUID,
  modo_nome           TEXT,
  modo_label          TEXT,
  modo_campos_resposta JSONB,
  subtab_nome         TEXT,
  etapa               TEXT,
  sessao_id           UUID,
  creditos_consumidos INTEGER,
  created_at          TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Localizar aluno pelo email
  SELECT pr.id INTO v_user_id
  FROM profiles pr
  WHERE pr.email = LOWER(TRIM(p_email))
    AND pr.user_type = 'aluno'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ji.id,
    ji.texto_original,
    ji.diagnostico,
    ji.sugestao_reescrita,
    ji.versao_melhorada,
    ji.resposta_json,
    ji.palavras_original,
    ji.palavras_melhorada,
    ji.modo_id,
    jm.nome      AS modo_nome,
    jm.label     AS modo_label,
    jm.campos_resposta AS modo_campos_resposta,
    ji.subtab_nome,
    ji.etapa,
    ji.sessao_id,
    ji.creditos_consumidos,
    ji.created_at
  FROM jarvis_interactions ji
  LEFT JOIN jarvis_modos jm ON ji.modo_id = jm.id
  WHERE ji.user_id = v_user_id
    -- ✅ FILTRO: mostrar apenas gerações finais
    AND (
      ji.etapa IS NULL              -- Interações normais (não-tutoria)
      OR ji.etapa = 'geracao'       -- Tutoria: apenas texto gerado final
    )
  ORDER BY ji.created_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_jarvis_historico_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_jarvis_historico_by_email(TEXT) TO authenticated;

COMMENT ON FUNCTION get_jarvis_historico_by_email IS
  'Retorna histórico do Jarvis filtrando apenas gerações finais (etapa=geracao), sem etapas intermediárias.';

-- ═════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ═════════════════════════════════════════════════════════════════════════

-- Testar: não deve aparecer etapa='sugestoes' nem etapa='validacao'
SELECT
  modo_label,
  subtab_nome,
  etapa,
  creditos_consumidos,
  LEFT(COALESCE(versao_melhorada, texto_original), 60) as preview,
  created_at
FROM get_jarvis_historico_by_email('alunof@gmail.com')
ORDER BY created_at DESC
LIMIT 10;

-- ✅ Resultado esperado:
-- - Interações normais: modo_label preenchido, etapa NULL
-- - Tutoria geração: modo_label='Tutoria', subtab_nome='introducao', etapa='geracao'
-- - ❌ NÃO deve aparecer: etapa='sugestoes' ou etapa='validacao'
