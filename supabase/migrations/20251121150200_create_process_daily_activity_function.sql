-- Migration: Criar função para processar atividades diárias dos alunos
-- Data: 2025-11-21
-- Objetivo: Função que será executada pelo cron job para processar atividades do dia anterior

-- Remover função anterior se existir
DROP FUNCTION IF EXISTS public.process_student_daily_activity(DATE);
DROP FUNCTION IF EXISTS public.process_student_daily_activity();

-- Função principal para processar atividades diárias
CREATE OR REPLACE FUNCTION public.process_student_daily_activity(
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_processed INTEGER := 0;
  v_aluno RECORD;
  v_visitante RECORD;
  v_redacoes_count INTEGER;
  v_had_essay BOOLEAN;
  v_last_login TIMESTAMPTZ;
  v_total_duration INTEGER;
  v_total_sessions INTEGER;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  v_start_time := now();

  -- Calcular o período de análise (últimas 24 horas até a data de referência)
  -- Se reference_date é hoje, analisamos de ontem às 03:00 até hoje às 03:00
  -- Se reference_date é uma data passada, analisamos aquele dia específico
  v_end_time := p_reference_date::TIMESTAMP;
  v_start_time := (p_reference_date - INTERVAL '1 day')::TIMESTAMP;

  RAISE NOTICE 'Processando atividades de % até %', v_start_time, v_end_time;

  -- Processar alunos da tabela profiles
  FOR v_aluno IN
    SELECT
      p.email,
      p.nome,
      p.turma,
      'aluno' as user_type
    FROM public.profiles p
    WHERE p.user_type = 'aluno'
      AND p.email IS NOT NULL
      AND p.email != ''
  LOOP
    -- Contar redações enviadas no período
    SELECT COUNT(*) INTO v_redacoes_count
    FROM public.redacoes_enviadas
    WHERE LOWER(TRIM(email_aluno)) = LOWER(TRIM(v_aluno.email))
      AND created_at >= v_start_time
      AND created_at < v_end_time;

    v_had_essay := v_redacoes_count > 0;

    -- Obter informações de login do período
    SELECT
      MAX(login_at) as last_login,
      COALESCE(SUM(session_duration_seconds), 0) as total_duration,
      COUNT(*) as total_sessions
    INTO v_last_login, v_total_duration, v_total_sessions
    FROM public.student_login_sessions
    WHERE LOWER(TRIM(student_email)) = LOWER(TRIM(v_aluno.email))
      AND login_at >= v_start_time
      AND login_at < v_end_time;

    -- Se não houver login registrado, setar valores padrão
    IF v_total_sessions IS NULL OR v_total_sessions = 0 THEN
      v_last_login := NULL;
      v_total_duration := 0;
      v_total_sessions := 0;
    END IF;

    -- Inserir ou atualizar registro
    INSERT INTO public.student_daily_activity (
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
      v_aluno.user_type,
      p_reference_date,
      v_had_essay,
      v_redacoes_count,
      v_last_login,
      v_total_duration,
      v_total_sessions
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

    v_total_processed := v_total_processed + 1;
  END LOOP;

  -- Processar visitantes da tabela visitante_sessoes
  FOR v_visitante IN
    SELECT
      vs.email_visitante as email,
      vs.nome_visitante as nome,
      'visitante' as turma,
      'visitante' as user_type
    FROM public.visitante_sessoes vs
    WHERE vs.email_visitante IS NOT NULL
      AND vs.email_visitante != ''
  LOOP
    -- Contar redações enviadas no período
    SELECT COUNT(*) INTO v_redacoes_count
    FROM public.redacoes_enviadas
    WHERE LOWER(TRIM(email_aluno)) = LOWER(TRIM(v_visitante.email))
      AND turma = 'visitante'
      AND created_at >= v_start_time
      AND created_at < v_end_time;

    v_had_essay := v_redacoes_count > 0;

    -- Obter informações de login do período
    SELECT
      MAX(login_at) as last_login,
      COALESCE(SUM(session_duration_seconds), 0) as total_duration,
      COUNT(*) as total_sessions
    INTO v_last_login, v_total_duration, v_total_sessions
    FROM public.student_login_sessions
    WHERE LOWER(TRIM(student_email)) = LOWER(TRIM(v_visitante.email))
      AND user_type = 'visitante'
      AND login_at >= v_start_time
      AND login_at < v_end_time;

    -- Se não houver login registrado, setar valores padrão
    IF v_total_sessions IS NULL OR v_total_sessions = 0 THEN
      v_last_login := NULL;
      v_total_duration := 0;
      v_total_sessions := 0;
    END IF;

    -- Inserir ou atualizar registro
    INSERT INTO public.student_daily_activity (
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
      LOWER(TRIM(v_visitante.email)),
      v_visitante.nome,
      v_visitante.turma,
      v_visitante.user_type,
      p_reference_date,
      v_had_essay,
      v_redacoes_count,
      v_last_login,
      v_total_duration,
      v_total_sessions
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

    v_total_processed := v_total_processed + 1;
  END LOOP;

  RAISE NOTICE 'Total de alunos/visitantes processados: %', v_total_processed;

  -- Retornar estatísticas
  RETURN json_build_object(
    'success', true,
    'reference_date', p_reference_date,
    'total_processed', v_total_processed,
    'start_time', v_start_time,
    'end_time', v_end_time,
    'processed_at', now()
  )::JSON;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro no processamento: %', SQLERRM;
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'reference_date', p_reference_date,
    'total_processed', v_total_processed
  )::JSON;
END;
$$;

COMMENT ON FUNCTION public.process_student_daily_activity IS
  'Processa atividades diárias dos alunos (login, redações). ' ||
  'Deve ser executado diariamente pelo cron job. ' ||
  'Analisa atividades do dia anterior e popula a tabela student_daily_activity.';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Função process_student_daily_activity criada com sucesso!';
  RAISE NOTICE 'ℹ️  Esta função deve ser chamada pelo Edge Function do cron job às 03:00 diariamente.';
END $$;
