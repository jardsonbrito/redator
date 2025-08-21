-- Remover versões antigas das funções RPC
DROP FUNCTION IF EXISTS public.count_monthly_recorded_lessons(uuid);
DROP FUNCTION IF EXISTS public.count_monthly_recorded_lessons(text);
DROP FUNCTION IF EXISTS public.get_recorded_lessons_radar();

-- Criar função unificada para contar vídeos mensais
CREATE OR REPLACE FUNCTION public.count_monthly_recorded_lessons(p_student_email text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  month_start TIMESTAMPTZ;
  month_end TIMESTAMPTZ;
  lesson_count INTEGER;
BEGIN
  -- Calcular limites do mês atual em Fortaleza
  month_start := date_trunc('month', (NOW() AT TIME ZONE 'America/Fortaleza'));
  month_end := month_start + INTERVAL '1 month';
  
  -- Contar aulas distintas assistidas no mês por email
  SELECT COUNT(*)::INTEGER INTO lesson_count
  FROM public.recorded_lesson_views rlv
  WHERE rlv.student_email = LOWER(TRIM(p_student_email))
    AND (rlv.first_watched_at AT TIME ZONE 'America/Fortaleza') >= month_start
    AND (rlv.first_watched_at AT TIME ZONE 'America/Fortaleza') < month_end;
  
  RETURN COALESCE(lesson_count, 0);
END;
$$;

-- Criar função unificada para radar
CREATE OR REPLACE FUNCTION public.get_recorded_lessons_radar()
RETURNS TABLE(
  student_id text,
  student_name text,
  student_email text,
  turma text,
  recorded_lessons_count integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  start_of_month timestamptz;
  end_of_month timestamptz;
BEGIN
  -- Calculate month boundaries in America/Fortaleza timezone
  start_of_month := date_trunc('month', (now() AT TIME ZONE 'America/Fortaleza'));
  end_of_month := start_of_month + interval '1 month';
  
  RETURN QUERY
  SELECT 
    p.id::text as student_id,
    p.nome || ' ' || p.sobrenome as student_name,
    p.email as student_email,
    COALESCE(p.turma, 'Não informado') as turma,
    public.count_monthly_recorded_lessons(p.email) as recorded_lessons_count
  FROM public.profiles p
  WHERE p.user_type = 'aluno' 
    AND p.ativo = true
    AND p.status_aprovacao = 'ativo'
  ORDER BY p.nome, p.sobrenome;
END;
$$;