-- Migration: Criar tabela para rastreamento de sessões de login dos alunos
-- Data: 2025-11-21
-- Objetivo: Rastrear quando alunos fazem login e logout para calcular tempo de sessão

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

CREATE TRIGGER trigger_calculate_session_duration
  BEFORE INSERT OR UPDATE ON public.student_login_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_session_duration();

-- RLS policies
ALTER TABLE public.student_login_sessions ENABLE ROW LEVEL SECURITY;

-- Admin pode ver e gerenciar tudo
CREATE POLICY "Admin can manage login sessions" ON public.student_login_sessions
  FOR ALL USING (is_main_admin()) WITH CHECK (is_main_admin());

-- Permitir inserção pública (para registrar logins)
CREATE POLICY "Public can insert login sessions" ON public.student_login_sessions
  FOR INSERT WITH CHECK (true);

-- Permitir atualização pública (para registrar logouts)
CREATE POLICY "Public can update own login sessions" ON public.student_login_sessions
  FOR UPDATE USING (true) WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.student_login_sessions IS 'Rastreia sessões de login dos alunos e visitantes';
COMMENT ON COLUMN public.student_login_sessions.login_at IS 'Timestamp do login';
COMMENT ON COLUMN public.student_login_sessions.logout_at IS 'Timestamp do logout';
COMMENT ON COLUMN public.student_login_sessions.session_duration_seconds IS 'Duração da sessão em segundos (calculado automaticamente)';

-- Remover funções anteriores se existirem
DROP FUNCTION IF EXISTS public.register_student_login(TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.register_student_logout(UUID);
DROP FUNCTION IF EXISTS public.register_student_logout_by_email(TEXT);

-- Função para registrar login
CREATE OR REPLACE FUNCTION public.register_student_login(
  p_student_email TEXT,
  p_student_name TEXT,
  p_turma TEXT,
  p_user_type TEXT,
  p_session_token UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Normalizar email
  p_student_email := LOWER(TRIM(p_student_email));

  -- Criar registro de login
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

-- Função para registrar logout
CREATE OR REPLACE FUNCTION public.register_student_logout(
  p_session_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.student_login_sessions
  SET logout_at = now()
  WHERE id = p_session_id
    AND logout_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Função para registrar logout por email (caso não tenha session_id)
CREATE OR REPLACE FUNCTION public.register_student_logout_by_email(
  p_student_email TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  -- Normalizar email
  p_student_email := LOWER(TRIM(p_student_email));

  -- Atualizar a sessão mais recente sem logout
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

  v_updated := FOUND;
  RETURN v_updated;
END;
$$;

-- Comentários nas funções
COMMENT ON FUNCTION public.register_student_login IS 'Registra o login de um aluno/visitante';
COMMENT ON FUNCTION public.register_student_logout IS 'Registra o logout de um aluno/visitante pelo ID da sessão';
COMMENT ON FUNCTION public.register_student_logout_by_email IS 'Registra o logout de um aluno/visitante pelo email (última sessão aberta)';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela student_login_sessions criada com sucesso!';
END $$;
