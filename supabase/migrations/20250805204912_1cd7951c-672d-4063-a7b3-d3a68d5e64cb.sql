-- Função para contar redações enviadas (excluindo devolvidas) por email de aluno
CREATE OR REPLACE FUNCTION public.count_student_submitted_redacoes(student_email text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(
    (SELECT COUNT(*)::integer 
     FROM public.redacoes_enviadas 
     WHERE email_aluno = LOWER(TRIM(student_email)) 
     AND (status IS NULL OR status != 'devolvida')) +
    (SELECT COUNT(*)::integer 
     FROM public.redacoes_simulado 
     WHERE email_aluno = LOWER(TRIM(student_email)) 
     AND devolvida_por IS NULL) +
    (SELECT COUNT(*)::integer 
     FROM public.redacoes_exercicio 
     WHERE email_aluno = LOWER(TRIM(student_email)) 
     AND devolvida_por IS NULL),
    0
  );
$function$;