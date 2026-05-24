-- RPC para estatísticas do Jarvis no boletim (filtradas por mês/ano)
CREATE OR REPLACE FUNCTION get_jarvis_boletim_by_email(
  p_email TEXT,
  p_mes   INT,
  p_ano   INT
)
RETURNS TABLE (
  total_interacoes  BIGINT,
  total_creditos    BIGINT,
  modos_distintos   TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_inicio    TIMESTAMP;
  v_fim       TIMESTAMP;
BEGIN
  SELECT pr.id INTO v_user_id
  FROM profiles pr
  WHERE pr.email = LOWER(TRIM(p_email))
    AND pr.user_type = 'aluno'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, ARRAY[]::TEXT[];
    RETURN;
  END IF;

  v_inicio := DATE_TRUNC('month', MAKE_DATE(p_ano, p_mes, 1)::DATE)::TIMESTAMP;
  v_fim    := v_inicio + INTERVAL '1 month';

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT                                            AS total_interacoes,
    COALESCE(SUM(ji.creditos_consumidos), 0)::BIGINT           AS total_creditos,
    ARRAY_AGG(DISTINCT jm.label ORDER BY jm.label)
      FILTER (WHERE jm.label IS NOT NULL)                       AS modos_distintos
  FROM jarvis_interactions ji
  LEFT JOIN jarvis_modos jm ON jm.id = ji.modo_id
  WHERE ji.user_id = v_user_id
    AND ji.created_at >= v_inicio
    AND ji.created_at <  v_fim;
END;
$$;

GRANT EXECUTE ON FUNCTION get_jarvis_boletim_by_email(TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_jarvis_boletim_by_email(TEXT, INT, INT) TO authenticated;

COMMENT ON FUNCTION get_jarvis_boletim_by_email IS
  'Retorna estatísticas de uso do Jarvis por aluno (email) em um mês/ano específico. SECURITY DEFINER pois alunos não possuem sessão Supabase Auth.';
