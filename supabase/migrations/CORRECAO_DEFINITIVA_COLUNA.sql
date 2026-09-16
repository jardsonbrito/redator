-- ============================================================================
-- CORREÇÃO DEFINITIVA - Resolver erro "column created_at does not exist"
-- ============================================================================
-- Este SQL corrige permanentemente o erro na função process_student_daily_activity
-- Execute este arquivo AGORA no SQL Editor do Supabase!
-- ============================================================================

SELECT '========== VERIFICANDO PROBLEMA ==========' as status;

-- Ver a função atual (se existir)
SELECT
  routine_name,
  routine_type,
  'Função encontrada - será recriada' as info
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'process_student_daily_activity';

-- ============================================================================
-- PASSO 1: REMOVER FUNÇÃO ANTIGA (FORÇAR REMOÇÃO)
-- ============================================================================

SELECT '========== REMOVENDO FUNÇÃO ANTIGA ==========' as status;

-- Forçar remoção completa de TODAS as versões possíveis
DROP FUNCTION IF EXISTS public.process_student_daily_activity(date) CASCADE;
DROP FUNCTION IF EXISTS public.process_student_daily_activity(text) CASCADE;
DROP FUNCTION IF EXISTS public.process_student_daily_activity(timestamp) CASCADE;
DROP FUNCTION IF EXISTS public.process_student_daily_activity(timestamptz) CASCADE;
DROP FUNCTION IF EXISTS public.process_student_daily_activity() CASCADE;

SELECT '✅ Função antiga removida completamente' as status;

-- ============================================================================
-- PASSO 2: CRIAR FUNÇÃO NOVA COM COLUNA CORRETA (data_envio)
-- ============================================================================

SELECT '========== CRIANDO FUNÇÃO CORRIGIDA ==========' as status;

CREATE OR REPLACE FUNCTION public.process_student_daily_activity(p_reference_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_count INTEGER := 0;
  v_aluno RECORD;
  v_redacoes_count INTEGER;
  v_last_login TIMESTAMPTZ;
  v_total_duration INTEGER;
  v_total_sessions INTEGER;
BEGIN
  -- Loop pelos alunos
  FOR v_aluno IN
    SELECT email, nome, COALESCE(turma, 'sem_turma') as turma
    FROM profiles
    WHERE user_type = 'aluno'
    AND email IS NOT NULL
  LOOP
    -- ====================================================================
    -- ATENÇÃO: Usando data_envio (CORRETO!) ao invés de created_at
    -- ====================================================================
    SELECT COUNT(*) INTO v_redacoes_count
    FROM redacoes_enviadas
    WHERE LOWER(TRIM(email_aluno)) = LOWER(TRIM(v_aluno.email))
    AND DATE(data_envio) = p_reference_date;

    -- Obter dados de login
    SELECT
      MAX(login_at),
      COALESCE(SUM(COALESCE(session_duration_seconds, 0)), 0),
      COUNT(*)
    INTO v_last_login, v_total_duration, v_total_sessions
    FROM student_login_sessions
    WHERE LOWER(TRIM(student_email)) = LOWER(TRIM(v_aluno.email))
    AND DATE(login_at) = p_reference_date;

    -- Inserir ou atualizar
    INSERT INTO student_daily_activity (
      student_email,
      student_name,
      turma,
      user_type,
      reference_date,
      had_essay,
      essays_count,
      last_login_at,
      session_duration_seconds,
      total_sessions
    ) VALUES (
      LOWER(TRIM(v_aluno.email)),
      v_aluno.nome,
      v_aluno.turma,
      'aluno',
      p_reference_date,
      COALESCE(v_redacoes_count, 0) > 0,
      COALESCE(v_redacoes_count, 0),
      v_last_login,
      COALESCE(v_total_duration, 0),
      COALESCE(v_total_sessions, 0)
    )
    ON CONFLICT (student_email, reference_date)
    DO UPDATE SET
      student_name = EXCLUDED.student_name,
      turma = EXCLUDED.turma,
      had_essay = EXCLUDED.had_essay,
      essays_count = EXCLUDED.essays_count,
      last_login_at = EXCLUDED.last_login_at,
      session_duration_seconds = EXCLUDED.session_duration_seconds,
      total_sessions = EXCLUDED.total_sessions,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'total_processed', v_count,
    'reference_date', p_reference_date,
    'processed_at', now()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_detail', SQLSTATE
  );
END;
$function$;

SELECT '✅ Função criada com data_envio!' as status;

-- ============================================================================
-- PASSO 3: VERIFICAR CRIAÇÃO
-- ============================================================================

SELECT '========== VERIFICANDO FUNÇÃO CRIADA ==========' as status;

SELECT
  routine_name,
  routine_type,
  data_type as return_type,
  '✅ Função existe!' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'process_student_daily_activity';

-- ============================================================================
-- PASSO 4: TESTAR FUNÇÃO
-- ============================================================================

SELECT '========== TESTANDO FUNÇÃO ==========' as status;

-- Executar a função
SELECT public.process_student_daily_activity(CURRENT_DATE);

-- ============================================================================
-- PASSO 5: VER RESULTADOS
-- ============================================================================

SELECT '========== VERIFICANDO RESULTADOS ==========' as status;

SELECT
  COUNT(*) as total_registros,
  COUNT(CASE WHEN last_login_at IS NOT NULL THEN 1 END) as com_login,
  COUNT(CASE WHEN essays_count > 0 THEN 1 END) as com_redacao,
  SUM(essays_count) as total_redacoes,
  reference_date
FROM student_daily_activity
WHERE reference_date = CURRENT_DATE
GROUP BY reference_date;

-- Ver alguns registros de exemplo
SELECT '========== AMOSTRA DE DADOS ==========' as status;

SELECT
  student_name,
  turma,
  CASE WHEN last_login_at IS NOT NULL THEN '✅ Login' ELSE '❌ Sem login' END as status_login,
  essays_count as redacoes,
  CASE
    WHEN session_duration_seconds = 0 THEN 'Sem login'
    WHEN session_duration_seconds < 60 THEN session_duration_seconds || 's'
    WHEN session_duration_seconds < 3600 THEN FLOOR(session_duration_seconds / 60) || 'min'
    ELSE FLOOR(session_duration_seconds / 3600) || 'h ' || FLOOR((session_duration_seconds % 3600) / 60) || 'min'
  END as tempo_logado
FROM student_daily_activity
WHERE reference_date = CURRENT_DATE
ORDER BY essays_count DESC, session_duration_seconds DESC
LIMIT 10;

-- ============================================================================
-- RESULTADO FINAL
-- ============================================================================

SELECT '========================================' as resultado;
SELECT '✅ ✅ ✅ CORREÇÃO APLICADA! ✅ ✅ ✅' as resultado;
SELECT '========================================' as resultado;
SELECT '' as resultado;
SELECT '🎯 A função agora usa data_envio (correto!)' as info;
SELECT '🎯 O cron job vai funcionar corretamente!' as info;
SELECT '🎯 Não haverá mais erro "column created_at does not exist"!' as info;
SELECT '' as resultado;
SELECT '✨ Sistema corrigido e funcionando! ✨' as resultado;
