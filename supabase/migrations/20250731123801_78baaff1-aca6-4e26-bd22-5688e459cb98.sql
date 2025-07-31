-- Finalizar corrigindo as últimas 14 funções que ainda faltam

CREATE OR REPLACE FUNCTION public.is_app_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT COALESCE(
    auth.email() = 'jardsonbrito@gmail.com' OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND email = 'jardsonbrito@gmail.com'
    ), 
    false
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_redacoes_by_turma_and_email(p_turma text, p_email text)
 RETURNS TABLE(id uuid, frase_tematica text, nome_aluno text, email_aluno text, tipo_envio text, data_envio timestamp with time zone, status text, corrigida boolean, nota_total integer, comentario_admin text, data_correcao timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.get_student_redacoes_com_status_finalizado(student_email text)
 RETURNS TABLE(id uuid, frase_tematica text, nome_aluno text, email_aluno text, tipo_envio text, data_envio timestamp with time zone, status text, corrigida boolean, nota_total integer, comentario_admin text, data_correcao timestamp with time zone, correcao_finalizada boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  -- Primeiro buscar o user_id do aluno pelo email
  WITH aluno_info AS (
    SELECT p.id as aluno_id, p.email as aluno_email
    FROM public.profiles p 
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(student_email))
    AND p.user_type = 'aluno'
    LIMIT 1
  )
  -- Redações regulares da tabela redacoes_enviadas
  SELECT 
    r.id,
    r.frase_tematica,
    r.nome_aluno,
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
    (r.status_corretor_1 = 'corrigida') as correcao_finalizada
  FROM public.redacoes_enviadas r, aluno_info ai
  WHERE (
    -- Buscar por user_id se disponível
    (r.user_id IS NOT NULL AND r.user_id = ai.aluno_id) OR
    -- Fallback para email se user_id for null (dados legados)
    (r.user_id IS NULL AND LOWER(TRIM(r.email_aluno)) = LOWER(TRIM(ai.aluno_email)))
  )
  AND r.tipo_envio IN ('regular', 'visitante')
  
  UNION ALL
  
  -- Redações de exercício
  SELECT 
    re.id,
    COALESCE(e.titulo, 'Exercício') as frase_tematica,
    re.nome_aluno,
    re.email_aluno,
    'exercicio' as tipo_envio,
    re.data_envio,
    COALESCE(CASE WHEN re.corrigida THEN 'corrigido' ELSE 'aguardando' END) as status,
    re.corrigida,
    -- Só mostrar nota se a correção foi FINALIZADA (status_corretor_1 = 'corrigida')
    CASE 
      WHEN re.status_corretor_1 = 'corrigida' THEN re.nota_total
      ELSE NULL
    END as nota_total,
    re.comentario_admin,
    re.data_correcao,
    -- Adicionar campo para indicar se a correção foi finalizada
    (re.status_corretor_1 = 'corrigida') as correcao_finalizada
  FROM public.redacoes_exercicio re
  LEFT JOIN public.exercicios e ON re.exercicio_id = e.id, aluno_info ai
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
    rs.nome_aluno,
    rs.email_aluno,
    'simulado' as tipo_envio,
    rs.data_envio,
    COALESCE(CASE WHEN rs.corrigida THEN 'corrigido' ELSE 'aguardando' END) as status,
    rs.corrigida,
    -- Só mostrar nota se AMBOS os corretores finalizaram (para simulados)
    CASE 
      WHEN rs.status_corretor_1 = 'corrigida' AND rs.status_corretor_2 = 'corrigida' THEN rs.nota_total
      ELSE NULL
    END as nota_total,
    rs.comentario_pedagogico as comentario_admin,
    rs.data_correcao,
    -- Para simulados, correção finalizada quando ambos corretores finalizaram
    (rs.status_corretor_1 = 'corrigida' AND rs.status_corretor_2 = 'corrigida') as correcao_finalizada
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

CREATE OR REPLACE FUNCTION public.get_simulados_por_corretor(turma_code text)
 RETURNS TABLE(id uuid, id_simulado uuid, nome_aluno text, email_aluno text, texto text, turma text, data_envio timestamp with time zone, corrigida boolean, nota_c1 integer, nota_c2 integer, nota_c3 integer, nota_c4 integer, nota_c5 integer, nota_total integer, comentario_pedagogico text, data_correcao timestamp with time zone, status_corretor_1 text, status_corretor_2 text, corretor_1_nome text, corretor_2_nome text, simulado_titulo text, simulado_frase_tematica text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT 
    rs.id,
    rs.id_simulado,
    rs.nome_aluno,
    rs.email_aluno,
    rs.texto,
    rs.turma,
    rs.data_envio,
    rs.corrigida,
    -- Só mostrar notas se o respectivo corretor FINALIZOU (não apenas salvou incompleta)
    CASE WHEN rs.status_corretor_1 = 'corrigida' THEN rs.nota_c1 ELSE NULL END as nota_c1,
    CASE WHEN rs.status_corretor_1 = 'corrigida' THEN rs.nota_c2 ELSE NULL END as nota_c2,
    CASE WHEN rs.status_corretor_1 = 'corrigida' THEN rs.nota_c3 ELSE NULL END as nota_c3,
    CASE WHEN rs.status_corretor_1 = 'corrigida' THEN rs.nota_c4 ELSE NULL END as nota_c4,
    CASE WHEN rs.status_corretor_1 = 'corrigida' THEN rs.nota_c5 ELSE NULL END as nota_c5,
    -- Só mostrar nota total se AMBOS os corretores finalizaram
    CASE WHEN rs.status_corretor_1 = 'corrigida' AND rs.status_corretor_2 = 'corrigida' THEN rs.nota_total ELSE NULL END as nota_total,
    rs.comentario_pedagogico,
    rs.data_correcao,
    COALESCE(rs.status_corretor_1, 'pendente') as status_corretor_1,
    COALESCE(rs.status_corretor_2, 'pendente') as status_corretor_2,
    c1.nome_completo as corretor_1_nome,
    c2.nome_completo as corretor_2_nome,
    s.titulo as simulado_titulo,
    s.frase_tematica as simulado_frase_tematica
  FROM public.redacoes_simulado rs
  LEFT JOIN public.simulados s ON rs.id_simulado = s.id
  LEFT JOIN public.corretores c1 ON rs.corretor_id_1 = c1.id
  LEFT JOIN public.corretores c2 ON rs.corretor_id_2 = c2.id
  WHERE rs.turma = turma_code
  ORDER BY rs.data_envio DESC;
$function$;

CREATE OR REPLACE FUNCTION public.criar_professor(p_nome_completo text, p_email text, p_role text DEFAULT 'professor'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'access_denied',
      'message', 'Acesso negado: apenas administradores podem criar professores'
    );
  END IF;
  
  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM public.professores WHERE email = LOWER(TRIM(p_email))) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_exists',
      'message', 'Este e-mail já está sendo usado por outro professor'
    );
  END IF;
  
  -- Inserir novo professor
  INSERT INTO public.professores (
    nome_completo,
    email,
    role,
    senha_hash,
    primeiro_login,
    ativo
  ) VALUES (
    TRIM(p_nome_completo),
    LOWER(TRIM(p_email)),
    p_role,
    '123456',
    true,
    true
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Professor criado com sucesso'
  );
END;
$function$;