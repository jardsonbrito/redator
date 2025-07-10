-- Primeiro, vamos preencher os user_id que estão null nas redações existentes
-- Usando o email_aluno para fazer o match com a tabela profiles

-- Atualizar redacoes_enviadas
UPDATE public.redacoes_enviadas 
SET user_id = p.id
FROM public.profiles p
WHERE redacoes_enviadas.user_id IS NULL 
AND redacoes_enviadas.email_aluno IS NOT NULL
AND LOWER(TRIM(redacoes_enviadas.email_aluno)) = LOWER(TRIM(p.email))
AND p.user_type = 'aluno';

-- Atualizar redacoes_simulado  
UPDATE public.redacoes_simulado
SET user_id = p.id
FROM public.profiles p
WHERE redacoes_simulado.user_id IS NULL
AND redacoes_simulado.email_aluno IS NOT NULL  
AND LOWER(TRIM(redacoes_simulado.email_aluno)) = LOWER(TRIM(p.email))
AND p.user_type = 'aluno';

-- Atualizar redacoes_exercicio
UPDATE public.redacoes_exercicio
SET user_id = p.id  
FROM public.profiles p
WHERE redacoes_exercicio.user_id IS NULL
AND redacoes_exercicio.email_aluno IS NOT NULL
AND LOWER(TRIM(redacoes_exercicio.email_aluno)) = LOWER(TRIM(p.email))
AND p.user_type = 'aluno';

-- Agora vamos atualizar as funções para buscar por user_id quando disponível

-- Atualizar função get_student_redacoes para buscar por user_id
CREATE OR REPLACE FUNCTION public.get_student_redacoes(student_email text)
 RETURNS TABLE(id uuid, frase_tematica text, nome_aluno text, email_aluno text, tipo_envio text, data_envio timestamp with time zone, status text, corrigida boolean, nota_total integer, comentario_admin text, data_correcao timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  -- Primeiro buscar o user_id do aluno pelo email
  WITH aluno_info AS (
    SELECT p.id as aluno_id, p.email as aluno_email
    FROM public.profiles p 
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(student_email))
    AND p.user_type = 'aluno'
    LIMIT 1
  )
  SELECT 
    r.id,
    r.frase_tematica,
    r.nome_aluno,
    r.email_aluno,
    COALESCE(r.tipo_envio, 'regular') as tipo_envio,
    r.data_envio,
    COALESCE(r.status, CASE WHEN r.corrigida THEN 'corrigido' ELSE 'aguardando' END) as status,
    r.corrigida,
    r.nota_total,
    r.comentario_admin,
    r.data_correcao
  FROM public.redacoes_enviadas r, aluno_info ai
  WHERE (
    -- Buscar por user_id se disponível
    (r.user_id IS NOT NULL AND r.user_id = ai.aluno_id) OR
    -- Fallback para email se user_id for null (dados legados)
    (r.user_id IS NULL AND LOWER(TRIM(r.email_aluno)) = LOWER(TRIM(ai.aluno_email)))
  )
  AND r.tipo_envio IN ('regular', 'simulado', 'visitante')
  ORDER BY r.data_envio DESC;
$function$;

-- Atualizar função get_redacoes_by_turma_and_email para buscar por user_id
CREATE OR REPLACE FUNCTION public.get_redacoes_by_turma_and_email(p_turma text, p_email text)
 RETURNS TABLE(id uuid, frase_tematica text, nome_aluno text, email_aluno text, tipo_envio text, data_envio timestamp with time zone, status text, corrigida boolean, nota_total integer, comentario_admin text, data_correcao timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  -- Primeiro buscar o user_id do aluno pelo email
  WITH aluno_info AS (
    SELECT p.id as aluno_id, p.email as aluno_email
    FROM public.profiles p 
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
    AND p.user_type = 'aluno'
    AND p.turma = p_turma
    LIMIT 1
  )
  SELECT 
    r.id,
    r.frase_tematica,
    r.nome_aluno,
    r.email_aluno,
    COALESCE(r.tipo_envio, 'regular') as tipo_envio,
    r.data_envio,
    COALESCE(r.status, CASE WHEN r.corrigida THEN 'corrigido' ELSE 'aguardando' END) as status,
    r.corrigida,
    r.nota_total,
    r.comentario_admin,
    r.data_correcao
  FROM public.redacoes_enviadas r, aluno_info ai
  WHERE (
    -- Buscar por user_id se disponível
    (r.user_id IS NOT NULL AND r.user_id = ai.aluno_id) OR
    -- Fallback para email se user_id for null (dados legados)
    (r.user_id IS NULL AND LOWER(TRIM(r.email_aluno)) = LOWER(TRIM(ai.aluno_email)))
  )
  AND r.turma = p_turma
  ORDER BY r.data_envio DESC;
$function$;

-- Criar função para buscar redações de simulado por user_id
CREATE OR REPLACE FUNCTION public.get_student_simulado_redacoes(student_email text)
 RETURNS TABLE(id uuid, frase_tematica text, nome_aluno text, email_aluno text, data_envio timestamp with time zone, corrigida boolean, nota_total integer, data_correcao timestamp with time zone, id_simulado uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  -- Primeiro buscar o user_id do aluno pelo email
  WITH aluno_info AS (
    SELECT p.id as aluno_id, p.email as aluno_email
    FROM public.profiles p 
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(student_email))
    AND p.user_type = 'aluno'
    LIMIT 1
  )
  SELECT 
    r.id,
    s.frase_tematica,
    r.nome_aluno,
    r.email_aluno,
    r.data_envio,
    r.corrigida,
    r.nota_total,
    r.data_correcao,
    r.id_simulado
  FROM public.redacoes_simulado r
  JOIN public.simulados s ON r.id_simulado = s.id, aluno_info ai
  WHERE (
    -- Buscar por user_id se disponível
    (r.user_id IS NOT NULL AND r.user_id = ai.aluno_id) OR
    -- Fallback para email se user_id for null (dados legados)
    (r.user_id IS NULL AND LOWER(TRIM(r.email_aluno)) = LOWER(TRIM(ai.aluno_email)))
  )
  ORDER BY r.data_envio DESC;
$function$;