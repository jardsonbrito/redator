-- Remover a função existente e criar nova
DROP FUNCTION IF EXISTS public.get_recorded_lessons_radar();

-- Criar RPC function para o radar de aulas gravadas com fuso horário correto
CREATE OR REPLACE FUNCTION public.get_recorded_lessons_radar()
RETURNS TABLE(
  student_id uuid,
  student_name text,
  student_email text,
  turma text,
  recorded_lessons_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as student_id,
    (p.nome || ' ' || COALESCE(p.sobrenome, ''))::text as student_name,
    p.email as student_email,
    COALESCE(p.turma, 'Não informado')::text as turma,
    COALESCE(COUNT(rlv.lesson_id), 0) as recorded_lessons_count
  FROM public.profiles p
  LEFT JOIN public.recorded_lesson_views rlv ON (
    rlv.student_email = p.email
    AND (rlv.first_watched_at AT TIME ZONE 'America/Fortaleza') >= 
        date_trunc('month', (now() AT TIME ZONE 'America/Fortaleza'))
    AND (rlv.first_watched_at AT TIME ZONE 'America/Fortaleza') < 
        (date_trunc('month', (now() AT TIME ZONE 'America/Fortaleza')) + INTERVAL '1 month')
  )
  WHERE p.user_type = 'aluno' 
    AND p.ativo = true 
    AND p.status_aprovacao = 'ativo'
  GROUP BY p.id, p.nome, p.sobrenome, p.email, p.turma
  ORDER BY recorded_lessons_count DESC, student_name ASC;
END;
$$;

-- Criar RPC function para contar aulas gravadas do mês para o aluno
CREATE OR REPLACE FUNCTION public.count_monthly_recorded_lessons(p_student_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT COUNT(*)::integer 
     FROM public.recorded_lesson_views 
     WHERE student_email = LOWER(TRIM(p_student_email))
       AND (first_watched_at AT TIME ZONE 'America/Fortaleza') >= 
           date_trunc('month', (now() AT TIME ZONE 'America/Fortaleza'))
       AND (first_watched_at AT TIME ZONE 'America/Fortaleza') < 
           (date_trunc('month', (now() AT TIME ZONE 'America/Fortaleza')) + INTERVAL '1 month')),
    0
  );
END;
$$;