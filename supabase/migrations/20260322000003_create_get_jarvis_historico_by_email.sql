-- RPC para buscar histórico do Jarvis por email
-- SECURITY DEFINER + grant anon: alunos não usam Supabase Auth, chamam com anon key
CREATE OR REPLACE FUNCTION get_jarvis_historico_by_email(p_email TEXT)
RETURNS TABLE (
  id UUID,
  texto_original TEXT,
  diagnostico TEXT,
  sugestao_reescrita TEXT,
  versao_melhorada TEXT,
  palavras_original INTEGER,
  palavras_melhorada INTEGER,
  created_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Localizar aluno pelo email (mesma chave usada pelo localStorage)
  SELECT pr.id INTO v_user_id
  FROM profiles pr
  WHERE pr.email = LOWER(TRIM(p_email))
    AND pr.user_type = 'aluno'
  LIMIT 1;

  -- Aluno não encontrado: retorna vazio
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Retorna apenas as interações desse aluno, mais recentes primeiro
  RETURN QUERY
  SELECT
    ji.id,
    ji.texto_original,
    ji.diagnostico,
    ji.sugestao_reescrita,
    ji.versao_melhorada,
    ji.palavras_original,
    ji.palavras_melhorada,
    ji.created_at
  FROM jarvis_interactions ji
  WHERE ji.user_id = v_user_id
  ORDER BY ji.created_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_jarvis_historico_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_jarvis_historico_by_email(TEXT) TO authenticated;

COMMENT ON FUNCTION get_jarvis_historico_by_email IS
  'Retorna histórico de análises do Jarvis para um aluno identificado por email. Usa SECURITY DEFINER pois alunos não possuem sessão Supabase Auth.';
