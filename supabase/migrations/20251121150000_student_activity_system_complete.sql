-- ============================================================================
-- SISTEMA COMPLETO DE MONITORAMENTO DE ATIVIDADES DOS ALUNOS
-- Data: 2025-11-21
-- Descrição: Implementa rastreamento de login/logout e processamento diário
-- ============================================================================

-- ============================================================================
-- PARTE 1: TABELA DE SESSÕES DE LOGIN
-- ============================================================================

-- Criar tabela student_login_sessions
CREATE TABLE IF NOT EXISTS public.student_login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  turma TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('aluno', 'visitante')),
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at TIMESTAMPTZ,
  session_duration_seconds INTEGER,
  session_token UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_student_login_sessions_email ON public.student_login_sessions(student_email);
CREATE INDEX IF NOT EXISTS idx_student_login_sessions_login_at ON public.student_login_sessions(login_at);
CREATE INDEX IF NOT EXISTS idx_student_login_sessions_turma ON public.student_login_sessions(turma);
CREATE INDEX IF NOT EXISTS idx_student_login_sessions_date ON public.student_login_sessions(DATE(login_at));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_student_login_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_login_sessions_updated_at ON public.student_login_sessions;
CREATE TRIGGER trigger_update_student_login_sessions_updated_at
  BEFORE UPDATE ON public.student_login_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_login_sessions_updated_at();

-- Trigger para calcular session_duration_seconds automaticamente
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.logout_at IS NOT NULL AND NEW.login_at IS NOT NULL THEN
    NEW.session_duration_seconds = EXTRACT(EPOCH FROM (NEW.logout_at - NEW.login_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_session_duration ON public.student_login_sessions;
CREATE TRIGGER trigger_calculate_session_duration
  BEFORE INSERT OR UPDATE ON public.student_login_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_session_duration();

-- RLS policies
ALTER TABLE public.student_login_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage login sessions" ON public.student_login_sessions;
CREATE POLICY "Admin can manage login sessions" ON public.student_login_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Public can insert login sessions" ON public.student_login_sessions;
CREATE POLICY "Public can insert login sessions" ON public.student_login_sessions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update own login sessions" ON public.student_login_sessions;
CREATE POLICY "Public can update own login sessions" ON public.student_login_sessions
  FOR UPDATE USING (true) WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.student_login_sessions IS 'Rastreia sessões de login dos alunos e visitantes';

-- Funções para gerenciar login/logout
DROP FUNCTION IF EXISTS public.register_student_login(TEXT, TEXT, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.register_student_login(
  p_student_email TEXT,
  p_student_name TEXT,
  p_turma TEXT,
  p_user_type TEXT,
  p_session_token UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  p_student_email := LOWER(TRIM(p_student_email));

  INSERT INTO public.student_login_sessions (
    student_email,
    student_name,
    turma,
    user_type,
    session_token,
    login_at
  ) VALUES (
    p_student_email,
    TRIM(p_student_name),
    TRIM(p_turma),
    p_user_type,
    p_session_token,
    now()
  ) RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

DROP FUNCTION IF EXISTS public.register_student_logout(UUID);
CREATE OR REPLACE FUNCTION public.register_student_logout(
  p_session_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.student_login_sessions
  SET logout_at = now()
  WHERE id = p_session_id
    AND logout_at IS NULL;

  RETURN FOUND;
END;
$$;

DROP FUNCTION IF EXISTS public.register_student_logout_by_email(TEXT);
CREATE OR REPLACE FUNCTION public.register_student_logout_by_email(
  p_student_email TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  p_student_email := LOWER(TRIM(p_student_email));

  UPDATE public.student_login_sessions
  SET logout_at = now()
  WHERE id = (
    SELECT id
    FROM public.student_login_sessions
    WHERE student_email = p_student_email
      AND logout_at IS NULL
    ORDER BY login_at DESC
    LIMIT 1
  );

  RETURN FOUND;
END;
$$;

-- ============================================================================
-- PARTE 2: TABELA DE ATIVIDADES DIÁRIAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  turma TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('aluno', 'visitante')),
  reference_date DATE NOT NULL,
  had_essay BOOLEAN NOT NULL DEFAULT false,
  essays_count INTEGER NOT NULL DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  session_duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_daily_activity UNIQUE (student_email, reference_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_student_daily_activity_email ON public.student_daily_activity(student_email);
CREATE INDEX IF NOT EXISTS idx_student_daily_activity_date ON public.student_daily_activity(reference_date);
CREATE INDEX IF NOT EXISTS idx_student_daily_activity_turma ON public.student_daily_activity(turma);
CREATE INDEX IF NOT EXISTS idx_student_daily_activity_had_essay ON public.student_daily_activity(had_essay);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_student_daily_activity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_daily_activity_updated_at ON public.student_daily_activity;
CREATE TRIGGER trigger_update_student_daily_activity_updated_at
  BEFORE UPDATE ON public.student_daily_activity
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_daily_activity_updated_at();

-- RLS policies
ALTER TABLE public.student_daily_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage daily activity" ON public.student_daily_activity;
CREATE POLICY "Admin can manage daily activity" ON public.student_daily_activity
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Public can read daily activity" ON public.student_daily_activity;
CREATE POLICY "Public can read daily activity" ON public.student_daily_activity
  FOR SELECT USING (true);

COMMENT ON TABLE public.student_daily_activity IS 'Resumo diário de atividades dos alunos';

-- Função para obter atividades de um aluno
DROP FUNCTION IF EXISTS public.get_student_activity(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.get_student_activity(
  p_student_email TEXT,
  p_days_limit INTEGER DEFAULT 30
) RETURNS TABLE (
  reference_date DATE,
  had_essay BOOLEAN,
  essays_count INTEGER,
  last_login_at TIMESTAMPTZ,
  session_duration_seconds INTEGER,
  total_sessions INTEGER,
  formatted_duration TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  p_student_email := LOWER(TRIM(p_student_email));

  RETURN QUERY
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
    END as formatted_duration
  FROM public.student_daily_activity sda
  WHERE sda.student_email = p_student_email
    AND sda.reference_date >= CURRENT_DATE - p_days_limit
  ORDER BY sda.reference_date DESC;
END;
$$;

-- ============================================================================
-- PARTE 3: FUNÇÃO DE PROCESSAMENTO DIÁRIO
-- ============================================================================

DROP FUNCTION IF EXISTS public.process_student_daily_activity(DATE);
CREATE OR REPLACE FUNCTION public.process_student_daily_activity(
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_end_time := p_reference_date::TIMESTAMP;
  v_start_time := (p_reference_date - INTERVAL '1 day')::TIMESTAMP;

  -- Processar alunos
  FOR v_aluno IN
    SELECT p.email, p.nome, p.turma, 'aluno' as user_type
    FROM public.profiles p
    WHERE p.user_type = 'aluno' AND p.email IS NOT NULL AND p.email != ''
  LOOP
    SELECT COUNT(*) INTO v_redacoes_count
    FROM public.redacoes_enviadas
    WHERE LOWER(TRIM(email_aluno)) = LOWER(TRIM(v_aluno.email))
      AND created_at >= v_start_time AND created_at < v_end_time;

    v_had_essay := v_redacoes_count > 0;

    SELECT MAX(login_at), COALESCE(SUM(session_duration_seconds), 0), COUNT(*)
    INTO v_last_login, v_total_duration, v_total_sessions
    FROM public.student_login_sessions
    WHERE LOWER(TRIM(student_email)) = LOWER(TRIM(v_aluno.email))
      AND login_at >= v_start_time AND login_at < v_end_time;

    IF v_total_sessions IS NULL OR v_total_sessions = 0 THEN
      v_last_login := NULL;
      v_total_duration := 0;
      v_total_sessions := 0;
    END IF;

    INSERT INTO public.student_daily_activity (
      student_email, student_name, turma, user_type, reference_date,
      had_essay, essays_count, last_login_at, session_duration_seconds, total_sessions
    ) VALUES (
      LOWER(TRIM(v_aluno.email)), v_aluno.nome, v_aluno.turma, v_aluno.user_type, p_reference_date,
      v_had_essay, v_redacoes_count, v_last_login, v_total_duration, v_total_sessions
    )
    ON CONFLICT (student_email, reference_date) DO UPDATE SET
      student_name = EXCLUDED.student_name,
      turma = EXCLUDED.turma,
      had_essay = EXCLUDED.had_essay,
      essays_count = EXCLUDED.essays_count,
      last_login_at = EXCLUDED.last_login_at,
      session_duration_seconds = EXCLUDED.session_duration_seconds,
      total_sessions = EXCLUDED.total_sessions;

    v_total_processed := v_total_processed + 1;
  END LOOP;

  -- Processar visitantes
  FOR v_visitante IN
    SELECT vs.email_visitante as email, vs.nome_visitante as nome, 'visitante' as turma, 'visitante' as user_type
    FROM public.visitante_sessoes vs
    WHERE vs.email_visitante IS NOT NULL AND vs.email_visitante != ''
  LOOP
    SELECT COUNT(*) INTO v_redacoes_count
    FROM public.redacoes_enviadas
    WHERE LOWER(TRIM(email_aluno)) = LOWER(TRIM(v_visitante.email))
      AND turma = 'visitante'
      AND created_at >= v_start_time AND created_at < v_end_time;

    v_had_essay := v_redacoes_count > 0;

    SELECT MAX(login_at), COALESCE(SUM(session_duration_seconds), 0), COUNT(*)
    INTO v_last_login, v_total_duration, v_total_sessions
    FROM public.student_login_sessions
    WHERE LOWER(TRIM(student_email)) = LOWER(TRIM(v_visitante.email))
      AND user_type = 'visitante'
      AND login_at >= v_start_time AND login_at < v_end_time;

    IF v_total_sessions IS NULL OR v_total_sessions = 0 THEN
      v_last_login := NULL;
      v_total_duration := 0;
      v_total_sessions := 0;
    END IF;

    INSERT INTO public.student_daily_activity (
      student_email, student_name, turma, user_type, reference_date,
      had_essay, essays_count, last_login_at, session_duration_seconds, total_sessions
    ) VALUES (
      LOWER(TRIM(v_visitante.email)), v_visitante.nome, v_visitante.turma, v_visitante.user_type, p_reference_date,
      v_had_essay, v_redacoes_count, v_last_login, v_total_duration, v_total_sessions
    )
    ON CONFLICT (student_email, reference_date) DO UPDATE SET
      student_name = EXCLUDED.student_name,
      turma = EXCLUDED.turma,
      had_essay = EXCLUDED.had_essay,
      essays_count = EXCLUDED.essays_count,
      last_login_at = EXCLUDED.last_login_at,
      session_duration_seconds = EXCLUDED.session_duration_seconds,
      total_sessions = EXCLUDED.total_sessions;

    v_total_processed := v_total_processed + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'reference_date', p_reference_date,
    'total_processed', v_total_processed,
    'start_time', v_start_time,
    'end_time', v_end_time,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'reference_date', p_reference_date,
    'total_processed', v_total_processed
  );
END;
$$;

-- ============================================================================
-- PARTE 4: CONFIGURAR CRON JOB
-- ============================================================================

-- Garantir extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover job anterior
DO $$
BEGIN
  PERFORM cron.unschedule('process-student-daily-activity');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Agendar para 03:00 BRT (06:00 UTC)
SELECT cron.schedule(
  'process-student-daily-activity',
  '0 6 * * *',
  'SELECT public.process_student_daily_activity(CURRENT_DATE);'
);

-- ============================================================================
-- LOG DE SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de monitoramento de atividades instalado com sucesso!';
  RAISE NOTICE 'ℹ️  Cron job agendado para 03:00 (America/Fortaleza)';
  RAISE NOTICE 'ℹ️  Para testar: SELECT process_student_daily_activity(CURRENT_DATE);';
END $$;
