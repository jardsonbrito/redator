-- Fix the get_recorded_lessons_radar RPC to correctly query the recorded_lesson_views table
-- The table uses student_email, not user_id, and times need proper timezone conversion

DROP FUNCTION IF EXISTS public.get_recorded_lessons_radar();

CREATE OR REPLACE FUNCTION public.get_recorded_lessons_radar()
RETURNS TABLE(
  student_id text,
  student_name text,
  student_email text,
  turma text,
  recorded_lessons_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    COALESCE((
      SELECT COUNT(*)::integer 
      FROM public.recorded_lesson_views rlv
      WHERE rlv.student_email = p.email
        AND (rlv.first_watched_at AT TIME ZONE 'America/Fortaleza') >= start_of_month
        AND (rlv.first_watched_at AT TIME ZONE 'America/Fortaleza') < end_of_month
    ), 0) as recorded_lessons_count
  FROM public.profiles p
  WHERE p.user_type = 'aluno' 
    AND p.ativo = true
    AND p.status_aprovacao = 'ativo'
  ORDER BY p.nome, p.sobrenome;
END;
$$;