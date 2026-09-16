-- Migration: Criar tabela para atividades diárias dos alunos
-- Data: 2025-11-21
-- Objetivo: Armazenar resumo diário de atividades (login, redações) para cada aluno

-- Criar tabela student_daily_activity
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

  -- Constraint para garantir um registro por aluno por dia
  CONSTRAINT unique_student_daily_activity UNIQUE (student_email, reference_date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_student_daily_activity_email ON public.student_daily_activity(student_email);
CREATE INDEX IF NOT EXISTS idx_student_daily_activity_date ON public.student_daily_activity(reference_date);
CREATE INDEX IF NOT EXISTS idx_student_daily_activity_turma ON public.student_daily_activity(turma);
CREATE INDEX IF NOT EXISTS idx_student_daily_activity_had_essay ON public.student_daily_activity(had_essay);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_student_daily_activity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_daily_activity_updated_at
  BEFORE UPDATE ON public.student_daily_activity
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_daily_activity_updated_at();

-- RLS policies
ALTER TABLE public.student_daily_activity ENABLE ROW LEVEL SECURITY;

-- Admin pode ver e gerenciar tudo
CREATE POLICY "Admin can manage daily activity" ON public.student_daily_activity
  FOR ALL USING (is_main_admin()) WITH CHECK (is_main_admin());

-- Permitir leitura pública para consultas
CREATE POLICY "Public can read daily activity" ON public.student_daily_activity
  FOR SELECT USING (true);

-- Comentários
COMMENT ON TABLE public.student_daily_activity IS 'Resumo diário de atividades dos alunos (login, redações)';
COMMENT ON COLUMN public.student_daily_activity.reference_date IS 'Data de referência (dia do registro)';
COMMENT ON COLUMN public.student_daily_activity.had_essay IS 'Se o aluno enviou pelo menos uma redação neste dia';
COMMENT ON COLUMN public.student_daily_activity.essays_count IS 'Quantidade de redações enviadas neste dia';
COMMENT ON COLUMN public.student_daily_activity.last_login_at IS 'Último login do aluno neste dia (pode ser NULL se não houver login)';
COMMENT ON COLUMN public.student_daily_activity.session_duration_seconds IS 'Tempo total logado neste dia em segundos';
COMMENT ON COLUMN public.student_daily_activity.total_sessions IS 'Quantidade de sessões de login neste dia';

-- Remover função anterior se existir
DROP FUNCTION IF EXISTS public.get_student_activity(TEXT, INTEGER);

-- Função para obter atividades de um aluno
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
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Normalizar email
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

COMMENT ON FUNCTION public.get_student_activity IS 'Retorna as atividades de um aluno nos últimos N dias';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela student_daily_activity criada com sucesso!';
END $$;
