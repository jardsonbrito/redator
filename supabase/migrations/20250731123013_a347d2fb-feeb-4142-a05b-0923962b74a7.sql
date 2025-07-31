-- Corrigir as funções restantes adicionando SET search_path = ''

-- 19. Função contar_mensagens_nao_lidas_aluno
CREATE OR REPLACE FUNCTION public.contar_mensagens_nao_lidas_aluno(aluno_email text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  aluno_id_val uuid;
  count_val integer;
BEGIN
  -- Buscar o ID do aluno pelo email
  SELECT id INTO aluno_id_val
  FROM public.profiles 
  WHERE email = LOWER(TRIM(aluno_email)) 
    AND user_type = 'aluno'
  LIMIT 1;
  
  -- Se não encontrar o aluno, retornar 0
  IF aluno_id_val IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Contar mensagens não lidas enviadas pelos corretores para este aluno
  SELECT COUNT(*)::integer INTO count_val
  FROM public.ajuda_rapida_mensagens 
  WHERE aluno_id = aluno_id_val 
    AND autor = 'corretor'
    AND lida = false;
  
  RETURN COALESCE(count_val, 0);
END;
$function$;

-- 20. Função set_current_user_email
CREATE OR REPLACE FUNCTION public.set_current_user_email(user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  PERFORM set_config('app.current_user_email', user_email, true);
END;
$function$;

-- 21. Função log_redacao_access
CREATE OR REPLACE FUNCTION public.log_redacao_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Log apenas para acessos de dados sensíveis (correções)
  IF NEW.corrigida = true AND OLD.corrigida = false THEN
    INSERT INTO public.access_logs (table_name, record_id, action, user_id, timestamp)
    VALUES ('redacoes_enviadas', NEW.id, 'correction_accessed', auth.uid(), now())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW; -- Não bloquear operação se log falhar
END;
$function$;

-- 22. Função log_denied_access
CREATE OR REPLACE FUNCTION public.log_denied_access(attempted_email text, redacao_email text, redacao_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.access_denied_log (attempted_email, redacao_email, redacao_id)
  VALUES (attempted_email, redacao_email, redacao_id);
EXCEPTION
  WHEN OTHERS THEN
    -- Não bloquear se log falhar
    NULL;
END;
$function$;

-- 23. Função get_avisos_corretor
CREATE OR REPLACE FUNCTION public.get_avisos_corretor(corretor_id_param uuid)
 RETURNS TABLE(id uuid, titulo text, descricao text, prioridade text, criado_em timestamp with time zone, imagem_url text, link_externo text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT 
    a.id,
    a.titulo,
    a.descricao,
    a.prioridade,
    a.criado_em,
    a.imagem_url,
    a.link_externo
  FROM public.avisos a
  WHERE a.status = 'publicado' 
    AND a.ativo = true
    AND (
      a.corretores_destinatarios IS NULL 
      OR corretor_id_param = ANY(a.corretores_destinatarios)
    )
    AND (
      a.data_agendamento IS NULL 
      OR a.data_agendamento <= now()
    )
  ORDER BY a.criado_em DESC;
$function$;

-- 24. Função iniciar_correcao_redacao
CREATE OR REPLACE FUNCTION public.iniciar_correcao_redacao(redacao_id uuid, tabela_nome text, corretor_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  corretor_info record;
  eh_corretor_1 boolean;
  eh_corretor_2 boolean;
BEGIN
  -- Buscar informações do corretor
  SELECT id, ativo INTO corretor_info 
  FROM public.corretores 
  WHERE email = corretor_email AND ativo = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Corretor não encontrado ou inativo';
  END IF;
  
  -- Atualizar status baseado na tabela
  IF tabela_nome = 'redacoes_enviadas' THEN
    -- Verificar se é corretor 1 ou 2
    SELECT 
      (corretor_id_1 = corretor_info.id) as eh_corretor_1,
      (corretor_id_2 = corretor_info.id) as eh_corretor_2
    INTO eh_corretor_1, eh_corretor_2
    FROM public.redacoes_enviadas 
    WHERE id = redacao_id;
    
    IF eh_corretor_1 THEN
      UPDATE public.redacoes_enviadas 
      SET 
        status_corretor_1 = 'em_correcao',
        status = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_1 = 'pendente';
    ELSIF eh_corretor_2 THEN
      UPDATE public.redacoes_enviadas 
      SET 
        status_corretor_2 = 'em_correcao',
        status = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_2 = 'pendente';
    END IF;
    
  ELSIF tabela_nome = 'redacoes_simulado' THEN
    -- Verificar se é corretor 1 ou 2
    SELECT 
      (corretor_id_1 = corretor_info.id) as eh_corretor_1,
      (corretor_id_2 = corretor_info.id) as eh_corretor_2
    INTO eh_corretor_1, eh_corretor_2
    FROM public.redacoes_simulado 
    WHERE id = redacao_id;
    
    IF eh_corretor_1 THEN
      UPDATE public.redacoes_simulado 
      SET status_corretor_1 = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_1 = 'pendente';
    ELSIF eh_corretor_2 THEN
      UPDATE public.redacoes_simulado 
      SET status_corretor_2 = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_2 = 'pendente';
    END IF;
    
  ELSIF tabela_nome = 'redacoes_exercicio' THEN
    -- Verificar se é corretor 1 ou 2
    SELECT 
      (corretor_id_1 = corretor_info.id) as eh_corretor_1,
      (corretor_id_2 = corretor_info.id) as eh_corretor_2
    INTO eh_corretor_1, eh_corretor_2
    FROM public.redacoes_exercicio 
    WHERE id = redacao_id;
    
    IF eh_corretor_1 THEN
      UPDATE public.redacoes_exercicio 
      SET status_corretor_1 = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_1 = 'pendente';
    ELSIF eh_corretor_2 THEN
      UPDATE public.redacoes_exercicio 
      SET status_corretor_2 = 'em_correcao'
      WHERE id = redacao_id 
        AND status_corretor_2 = 'pendente';
    END IF;
  END IF;
  
  RETURN true;
END;
$function$;

-- 25. Função get_redacoes_corretor_detalhadas
CREATE OR REPLACE FUNCTION public.get_redacoes_corretor_detalhadas(corretor_email text)
 RETURNS TABLE(id uuid, tipo_redacao text, nome_aluno text, email_aluno text, frase_tematica text, data_envio timestamp with time zone, texto text, status_minha_correcao text, eh_corretor_1 boolean, eh_corretor_2 boolean, redacao_manuscrita_url text)
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
    r.redacao_texto as texto,
    CASE 
      WHEN c1.email = corretor_email THEN COALESCE(r.status_corretor_1, 'pendente')
      WHEN c2.email = corretor_email THEN COALESCE(r.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END as status_minha_correcao,
    (c1.email = corretor_email) as eh_corretor_1,
    (c2.email = corretor_email) as eh_corretor_2,
    r.redacao_manuscrita_url
  FROM public.redacoes_enviadas r
  LEFT JOIN public.corretores c1 ON r.corretor_id_1 = c1.id
  LEFT JOIN public.corretores c2 ON r.corretor_id_2 = c2.id
  WHERE (c1.email = corretor_email OR c2.email = corretor_email) 
    AND (c1.ativo = true OR c2.ativo = true)
  
  UNION ALL
  
  -- Redações de simulado
  SELECT 
    r.id,
    'simulado' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    s.frase_tematica,
    r.data_envio,
    r.texto,
    CASE 
      WHEN c1.email = corretor_email THEN COALESCE(r.status_corretor_1, 'pendente')
      WHEN c2.email = corretor_email THEN COALESCE(r.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END as status_minha_correcao,
    (c1.email = corretor_email) as eh_corretor_1,
    (c2.email = corretor_email) as eh_corretor_2,
    r.redacao_manuscrita_url
  FROM public.redacoes_simulado r
  JOIN public.simulados s ON r.id_simulado = s.id
  LEFT JOIN public.corretores c1 ON r.corretor_id_1 = c1.id
  LEFT JOIN public.corretores c2 ON r.corretor_id_2 = c2.id
  WHERE (c1.email = corretor_email OR c2.email = corretor_email) 
    AND (c1.ativo = true OR c2.ativo = true)
  
  UNION ALL
  
  -- Redações de exercício
  SELECT 
    r.id,
    'exercicio' as tipo_redacao,
    r.nome_aluno,
    r.email_aluno,
    e.titulo as frase_tematica,
    r.data_envio,
    r.redacao_texto as texto,
    CASE 
      WHEN c1.email = corretor_email THEN COALESCE(r.status_corretor_1, 'pendente')
      WHEN c2.email = corretor_email THEN COALESCE(r.status_corretor_2, 'pendente')
      ELSE 'pendente'
    END as status_minha_correcao,
    (c1.email = corretor_email) as eh_corretor_1,
    (c2.email = corretor_email) as eh_corretor_2,
    r.redacao_manuscrita_url
  FROM public.redacoes_exercicio r
  JOIN public.exercicios e ON r.exercicio_id = e.id
  LEFT JOIN public.corretores c1 ON r.corretor_id_1 = c1.id
  LEFT JOIN public.corretores c2 ON r.corretor_id_2 = c2.id
  WHERE (c1.email = corretor_email OR c2.email = corretor_email) 
    AND (c1.ativo = true OR c2.ativo = true)
  
  ORDER BY data_envio DESC;
$function$;