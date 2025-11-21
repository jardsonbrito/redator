-- ============================================================================
-- FUNÇÃO HÍBRIDA - Mostra dados consolidados + tempo real
-- ============================================================================
-- Esta função retorna:
-- - Dias anteriores: dados processados pelo cron (student_daily_activity)
-- - Dia atual: dados em tempo real (student_login_sessions)
-- ============================================================================

DROP FUNCTION IF EXISTS get_student_activity_hybrid CASCADE;

CREATE OR REPLACE FUNCTION get_student_activity_hybrid(
  p_student_email TEXT,
  p_days_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  reference_date DATE,
  had_essay BOOLEAN,
  essays_count INTEGER,
  last_login_at TIMESTAMPTZ,
  session_duration_seconds INTEGER,
  total_sessions INTEGER,
  formatted_duration TEXT,
  is_today BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH dias_anteriores AS (
    -- Dados consolidados de dias anteriores
    SELECT
      sda.reference_date,
      sda.had_essay,
      sda.essays_count,
      sda.last_login_at,
      sda.session_duration_seconds,
      sda.total_sessions,
      CASE
        WHEN sda.session_duration_seconds = 0 THEN 'Sem login'
        WHEN sda.session_duration_seconds < 60 THEN sda.session_duration_seconds || ' segundos'
        WHEN sda.session_duration_seconds < 3600 THEN FLOOR(sda.session_duration_seconds / 60) || ' minutos'
        ELSE FLOOR(sda.session_duration_seconds / 3600) || 'h ' || FLOOR((sda.session_duration_seconds % 3600) / 60) || 'min'
      END as formatted_duration,
      false as is_today
    FROM student_daily_activity sda
    WHERE sda.student_email = LOWER(TRIM(p_student_email))
      AND sda.reference_date >= CURRENT_DATE - p_days_limit
      AND sda.reference_date < CURRENT_DATE
  ),
  dia_atual AS (
    -- Dados em tempo real do dia atual
    SELECT
      CURRENT_DATE as reference_date,
      (
        SELECT COUNT(*) > 0
        FROM redacoes_enviadas
        WHERE LOWER(TRIM(email_aluno)) = LOWER(TRIM(p_student_email))
        AND DATE(data_envio) = CURRENT_DATE
      ) as had_essay,
      (
        SELECT COUNT(*)::INTEGER
        FROM redacoes_enviadas
        WHERE LOWER(TRIM(email_aluno)) = LOWER(TRIM(p_student_email))
        AND DATE(data_envio) = CURRENT_DATE
      ) as essays_count,
      MAX(sls.login_at) as last_login_at,
      COALESCE(SUM(COALESCE(sls.session_duration_seconds, 0))::INTEGER, 0) as session_duration_seconds,
      COUNT(*)::INTEGER as total_sessions,
      CASE
        WHEN COALESCE(SUM(COALESCE(sls.session_duration_seconds, 0)), 0) = 0 THEN 'Sem login'
        WHEN COALESCE(SUM(COALESCE(sls.session_duration_seconds, 0)), 0) < 60 THEN COALESCE(SUM(COALESCE(sls.session_duration_seconds, 0)), 0)::TEXT || ' segundos'
        WHEN COALESCE(SUM(COALESCE(sls.session_duration_seconds, 0)), 0) < 3600 THEN FLOOR(COALESCE(SUM(COALESCE(sls.session_duration_seconds, 0)), 0) / 60)::TEXT || ' minutos'
        ELSE FLOOR(COALESCE(SUM(COALESCE(sls.session_duration_seconds, 0)), 0) / 3600)::TEXT || 'h ' || FLOOR((COALESCE(SUM(COALESCE(sls.session_duration_seconds, 0)), 0) % 3600) / 60)::TEXT || 'min'
      END as formatted_duration,
      true as is_today
    FROM student_login_sessions sls
    WHERE LOWER(TRIM(sls.student_email)) = LOWER(TRIM(p_student_email))
      AND DATE(sls.login_at) = CURRENT_DATE
  )
  -- Unir dias anteriores + dia atual
  SELECT * FROM dias_anteriores
  UNION ALL
  SELECT * FROM dia_atual
  WHERE EXISTS (
    SELECT 1 FROM student_login_sessions
    WHERE LOWER(TRIM(student_email)) = LOWER(TRIM(p_student_email))
    AND DATE(login_at) = CURRENT_DATE
  )
  ORDER BY reference_date DESC;
END;
$$;

SELECT '✅ Função híbrida criada!' as status;
SELECT 'Agora o modal mostrará dados em tempo real do dia atual!' as info;

-- TESTAR
SELECT '========== TESTANDO FUNÇÃO HÍBRIDA ==========' as status;

-- Substitua 'alunoa@gmail.com' pelo email do aluno que você quer testar
SELECT
  reference_date,
  CASE WHEN is_today THEN '⚡ HOJE (tempo real)' ELSE '📅 Consolidado' END as tipo,
  CASE WHEN last_login_at IS NOT NULL THEN '✅ Login' ELSE '❌ Sem login' END as login,
  essays_count as redacoes,
  formatted_duration as tempo_logado,
  total_sessions as sessoes
FROM get_student_activity_hybrid('alunoa@gmail.com', 30)
ORDER BY reference_date DESC
LIMIT 10;

SELECT '' as divisor;
SELECT '✅ Teste concluído! Veja os resultados acima.' as resultado;
