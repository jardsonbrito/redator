-- Continuar corrigindo as funções restantes adicionando SET search_path = ''

-- 11. Função recusar_aluno
CREATE OR REPLACE FUNCTION public.recusar_aluno(aluno_id uuid, admin_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem recusar alunos';
  END IF;

  -- Atualizar status do aluno
  UPDATE public.profiles 
  SET 
    status_aprovacao = 'recusado',
    ativo = false,
    aprovado_por = admin_id,
    data_aprovacao = now(),
    updated_at = now()
  WHERE id = aluno_id 
    AND user_type = 'aluno' 
    AND status_aprovacao = 'pendente';

  -- Verificar se a atualização foi bem-sucedida
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$function$;

-- 12. Função get_redacoes_by_turma
CREATE OR REPLACE FUNCTION public.get_redacoes_by_turma(p_turma text)
 RETURNS TABLE(id uuid, frase_tematica text, nome_aluno text, tipo_envio text, data_envio timestamp with time zone, status text, corrigida boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT 
    r.id,
    r.frase_tematica,
    r.nome_aluno,
    COALESCE(r.tipo_envio, 'regular') as tipo_envio,
    r.data_envio,
    COALESCE(r.status, CASE WHEN r.corrigida THEN 'corrigido' ELSE 'aguardando' END) as status,
    r.corrigida
  FROM public.redacoes_enviadas r
  WHERE r.turma = p_turma 
  AND COALESCE(r.tipo_envio, 'regular') != 'visitante'
  ORDER BY r.data_envio DESC;
$function$;

-- 13. Função auto_publish_tema_after_simulado
CREATE OR REPLACE FUNCTION public.auto_publish_tema_after_simulado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- Verifica se o simulado foi encerrado (data_fim + hora_fim passou)
  IF (NEW.data_fim || ' ' || NEW.hora_fim)::timestamp < NOW() 
     AND OLD.tema_id IS NOT NULL THEN
    
    -- Atualiza o tema para publicado se estava em rascunho
    UPDATE public.temas 
    SET status = 'publicado' 
    WHERE id = OLD.tema_id AND status = 'rascunho';
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 14. Função check_and_publish_expired_simulados
CREATE OR REPLACE FUNCTION public.check_and_publish_expired_simulados()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.temas 
  SET status = 'publicado' 
  WHERE id IN (
    SELECT s.tema_id 
    FROM public.simulados s 
    WHERE s.tema_id IS NOT NULL 
    AND (s.data_fim || ' ' || s.hora_fim)::timestamp < NOW()
    AND EXISTS (
      SELECT 1 FROM public.temas t 
      WHERE t.id = s.tema_id AND t.status = 'rascunho'
    )
  );
END;
$function$;

-- 15. Função create_simple_profile
CREATE OR REPLACE FUNCTION public.create_simple_profile(p_nome text, p_email text, p_turma text)
 RETURNS TABLE(id uuid, nome text, sobrenome text, email text, turma text, user_type text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  new_profile_id uuid;
BEGIN
  -- Generate a new UUID for the profile
  new_profile_id := gen_random_uuid();
  
  -- Insert the new profile without foreign key dependency
  INSERT INTO public.profiles (id, nome, sobrenome, email, turma, user_type, created_at, updated_at)
  VALUES (
    new_profile_id,
    p_nome,
    '',
    p_email,
    p_turma,
    'aluno',
    now(),
    now()
  );
  
  -- Return the created profile
  RETURN QUERY
  SELECT 
    pr.id,
    pr.nome,
    pr.sobrenome,
    pr.email,
    pr.turma,
    pr.user_type,
    pr.created_at,
    pr.updated_at
  FROM public.profiles pr
  WHERE pr.id = new_profile_id;
END;
$function$;

-- 16. Função get_redacoes_corretor
CREATE OR REPLACE FUNCTION public.get_redacoes_corretor(corretor_email text)
 RETURNS TABLE(id uuid, tipo_redacao text, nome_aluno text, email_aluno text, frase_tematica text, data_envio timestamp with time zone, corrigida boolean, texto text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  -- Redações enviadas regulares
  SELECT 
    r.id,
    'regular' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    r.frase_tematica,
    r.data_envio,
    r.corrigida,
    r.redacao_texto as texto
  FROM public.redacoes_enviadas r
  JOIN public.corretores c1 ON r.corretor_id_1 = c1.id OR r.corretor_id_2 = c1.id
  WHERE c1.email = corretor_email AND c1.ativo = true
  
  UNION ALL
  
  -- Redações de simulado
  SELECT 
    r.id,
    'simulado' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    s.frase_tematica,
    r.data_envio,
    r.corrigida,
    r.texto
  FROM public.redacoes_simulado r
  JOIN public.simulados s ON r.id_simulado = s.id
  JOIN public.corretores c2 ON r.corretor_id_1 = c2.id OR r.corretor_id_2 = c2.id
  WHERE c2.email = corretor_email AND c2.ativo = true
  
  UNION ALL
  
  -- Redações de exercício
  SELECT 
    r.id,
    'exercicio' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    e.titulo as frase_tematica,
    r.data_envio,
    r.corrigida,
    r.redacao_texto as texto
  FROM public.redacoes_exercicio r
  JOIN public.exercicios e ON r.exercicio_id = e.id
  JOIN public.corretores c3 ON r.corretor_id_1 = c3.id OR r.corretor_id_2 = c3.id
  WHERE c3.email = corretor_email AND c3.ativo = true
  
  ORDER BY data_envio DESC;
$function$;

-- 17. Função update_corretores_updated_at
CREATE OR REPLACE FUNCTION public.update_corretores_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$function$;

-- 18. Função can_access_redacao
CREATE OR REPLACE FUNCTION public.can_access_redacao(redacao_email text, user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Log da tentativa de acesso para auditoria
  RAISE LOG 'AUDITORIA: Tentativa de acesso - Redacao Email: %, User Email: %', redacao_email, user_email;
  
  -- Verificações rigorosas
  IF redacao_email IS NULL OR user_email IS NULL THEN
    RAISE LOG 'NEGADO: Email nulo detectado';
    RETURN false;
  END IF;
  
  -- Normalização e comparação exata
  IF LOWER(TRIM(redacao_email)) != LOWER(TRIM(user_email)) THEN
    RAISE LOG 'NEGADO: Emails diferentes - % vs %', LOWER(TRIM(redacao_email)), LOWER(TRIM(user_email));
    RETURN false;
  END IF;
  
  -- Permitir admin principal
  IF public.is_main_admin() THEN
    RAISE LOG 'PERMITIDO: Acesso admin';
    RETURN true;
  END IF;
  
  RAISE LOG 'PERMITIDO: Emails idênticos validados';
  RETURN true;
END;
$function$;