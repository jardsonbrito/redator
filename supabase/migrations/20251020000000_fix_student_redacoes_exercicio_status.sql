-- Atualizar função get_student_redacoes_com_status_finalizado para incluir status e exercicio_id corretos

CREATE OR REPLACE FUNCTION public.get_student_redacoes_com_status_finalizado(student_email text)
RETURNS TABLE(
  id uuid,
  frase_tematica text,
  nome_aluno text,
  email_aluno text,
  tipo_envio text,
  data_envio timestamp with time zone,
  status text,
  corrigida boolean,
  nota_total integer,
  comentario_admin text,
  data_correcao timestamp with time zone,
  correcao_finalizada boolean,
  exercicio_id uuid,
  turma text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  -- Primeiro buscar o user_id do aluno pelo email
  WITH aluno_info AS (
    SELECT p.id as aluno_id, p.email as aluno_email, p.turma as aluno_turma, p.nome as aluno_nome
    FROM public.profiles p
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(student_email))
    AND p.user_type = 'aluno'
    LIMIT 1
  )
  -- Redações regulares da tabela redacoes_enviadas
  SELECT
    r.id,
    r.frase_tematica,
    COALESCE(ai.aluno_nome, r.nome_aluno, 'Aluno') as nome_aluno,
    r.email_aluno,
    COALESCE(r.tipo_envio, 'regular') as tipo_envio,
    r.data_envio,
    COALESCE(r.status, CASE WHEN r.corrigida THEN 'corrigido' ELSE 'aguardando' END) as status,
    r.corrigida,
    -- Só mostrar nota se a correção foi FINALIZADA (status_corretor_1 = 'corrigida')
    CASE
      WHEN r.status_corretor_1 = 'corrigida' THEN r.nota_total
      ELSE NULL
    END as nota_total,
    r.comentario_admin,
    r.data_correcao,
    -- Adicionar campo para indicar se a correção foi finalizada
    (r.status_corretor_1 = 'corrigida') as correcao_finalizada,
    NULL::uuid as exercicio_id,
    r.turma
  FROM public.redacoes_enviadas r, aluno_info ai
  WHERE (
    -- Buscar por user_id se disponível
    (r.user_id IS NOT NULL AND r.user_id = ai.aluno_id) OR
    -- Fallback para email se user_id for null (dados legados)
    (r.user_id IS NULL AND LOWER(TRIM(r.email_aluno)) = LOWER(TRIM(ai.aluno_email)))
  )
  AND r.tipo_envio IN ('regular', 'visitante')

  UNION ALL

  -- Redações de exercício (CORRIGIDO: usar campo status da tabela)
  SELECT
    re.id,
    COALESCE(t.frase_tematica, e.titulo, 'Exercício') as frase_tematica,
    COALESCE(ai.aluno_nome, re.nome_aluno, 'Aluno') as nome_aluno,
    re.email_aluno,
    'exercicio' as tipo_envio,
    re.data_envio,
    -- USAR O CAMPO STATUS DA TABELA redacoes_exercicio
    COALESCE(re.status, CASE WHEN re.corrigida THEN 'corrigido' ELSE 'aguardando' END) as status,
    re.corrigida,
    -- Só mostrar nota se a correção foi FINALIZADA (status_corretor_1 = 'corrigida')
    CASE
      WHEN re.status_corretor_1 = 'corrigida' THEN re.nota_total
      ELSE NULL
    END as nota_total,
    re.comentario_admin,
    re.data_correcao,
    -- Adicionar campo para indicar se a correção foi finalizada
    (re.status_corretor_1 = 'corrigida') as correcao_finalizada,
    re.exercicio_id,
    ai.aluno_turma as turma
  FROM public.redacoes_exercicio re
  LEFT JOIN public.exercicios e ON re.exercicio_id = e.id
  LEFT JOIN public.temas t ON e.tema_id = t.id,
  aluno_info ai
  WHERE (
    -- Buscar por user_id se disponível
    (re.user_id IS NOT NULL AND re.user_id = ai.aluno_id) OR
    -- Fallback para email se user_id for null (dados legados)
    (re.user_id IS NULL AND LOWER(TRIM(re.email_aluno)) = LOWER(TRIM(ai.aluno_email)))
  )

  UNION ALL

  -- Redações de simulado
  SELECT
    rs.id,
    COALESCE(s.frase_tematica, s.titulo) as frase_tematica,
    COALESCE(ai.aluno_nome, rs.nome_aluno, 'Aluno') as nome_aluno,
    rs.email_aluno,
    'simulado' as tipo_envio,
    rs.data_envio,
    CASE WHEN rs.corrigida THEN 'corrigido' ELSE 'aguardando' END as status,
    rs.corrigida,
    -- Só mostrar nota se AMBOS os corretores finalizaram (para simulados)
    CASE
      WHEN rs.status_corretor_1 = 'corrigida' AND rs.status_corretor_2 = 'corrigida' THEN rs.nota_total
      ELSE NULL
    END as nota_total,
    rs.comentario_pedagogico as comentario_admin,
    rs.data_correcao,
    -- Para simulados, correção finalizada quando ambos corretores finalizaram
    (rs.status_corretor_1 = 'corrigida' AND rs.status_corretor_2 = 'corrigida') as correcao_finalizada,
    NULL::uuid as exercicio_id,
    rs.turma
  FROM public.redacoes_simulado rs
  LEFT JOIN public.simulados s ON rs.id_simulado = s.id, aluno_info ai
  WHERE (
    -- Buscar por user_id se disponível
    (rs.user_id IS NOT NULL AND rs.user_id = ai.aluno_id) OR
    -- Fallback para email se user_id for null (dados legados)
    (rs.user_id IS NULL AND LOWER(TRIM(rs.email_aluno)) = LOWER(TRIM(ai.aluno_email)))
  )

  ORDER BY data_envio DESC;
$function$;
