-- Corrigir função para excluir Produção Guiada da contagem de redações enviadas.
-- redacoes_exercicio contém exclusivamente Produção Guiada (exercício, não redação).
-- A versão em produção já está correta; este arquivo sincroniza o repositório local.
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
     AND (status IS NULL OR status != 'devolvida')
     AND deleted_at IS NULL) +
    (SELECT COUNT(*)::integer
     FROM public.redacoes_simulado
     WHERE email_aluno = LOWER(TRIM(student_email))
     AND devolvida_por IS NULL
     AND deleted_at IS NULL),
    0
  );
$function$;
