-- Atualiza RPC para retornar todos os campos necessários,
-- incluindo campos de tutoria e dados do modo via JOIN com jarvis_modos.
CREATE OR REPLACE FUNCTION get_jarvis_historico_by_email(p_email TEXT)
RETURNS TABLE (
  id UUID,
  texto_original TEXT,
  diagnostico TEXT,
  sugestao_reescrita TEXT,
  versao_melhorada TEXT,
  resposta_json JSONB,
  palavras_original INTEGER,
  palavras_melhorada INTEGER,
  modo_id UUID,
  modo_nome TEXT,
  modo_label TEXT,
  modo_campos_resposta JSONB,
  subtab_nome TEXT,
  etapa TEXT,
  sessao_id UUID,
  creditos_consumidos INTEGER,
  created_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
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
    jm.nome       AS modo_nome,
    jm.label      AS modo_label,
    jm.campos_resposta AS modo_campos_resposta,
    ji.subtab_nome,
    ji.etapa,
    ji.sessao_id,
    COALESCE(ji.creditos_consumidos, 0) AS creditos_consumidos,
    ji.created_at
  FROM jarvis_interactions ji
  LEFT JOIN jarvis_modos jm ON jm.id = ji.modo_id
  WHERE ji.user_id = v_user_id
  ORDER BY ji.created_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_jarvis_historico_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_jarvis_historico_by_email(TEXT) TO authenticated;

COMMENT ON FUNCTION get_jarvis_historico_by_email IS
  'Retorna histórico de interações do Jarvis para um aluno identificado por email. Inclui campos de tutoria (subtab_nome, etapa, sessao_id, creditos_consumidos) e dados do modo (modo_nome, modo_label, modo_campos_resposta via JOIN). Usa SECURITY DEFINER pois alunos não possuem sessão Supabase Auth.';
