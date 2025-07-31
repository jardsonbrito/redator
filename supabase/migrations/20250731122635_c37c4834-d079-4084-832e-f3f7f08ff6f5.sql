-- Corrigir todas as funções adicionando SET search_path = '' para segurança

-- 1. Função is_admin_user
CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT auth.email() = 'jardsonbrito@gmail.com';
$function$;

-- 2. Função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$function$;

-- 3. Função update_profiles_updated_at
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. Função is_corretor
CREATE OR REPLACE FUNCTION public.is_corretor(user_email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.corretores 
    WHERE email = user_email AND ativo = true
  );
$function$;

-- 5. Função update_marcacoes_updated_at
CREATE OR REPLACE FUNCTION public.update_marcacoes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$function$;

-- 6. Função limpar_mensagens_antigas
CREATE OR REPLACE FUNCTION public.limpar_mensagens_antigas()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.ajuda_rapida_mensagens 
  WHERE criado_em < NOW() - INTERVAL '30 days';
END;
$function$;

-- 7. Função contar_mensagens_nao_lidas_corretor
CREATE OR REPLACE FUNCTION public.contar_mensagens_nao_lidas_corretor(corretor_email text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT COUNT(DISTINCT concat(m.aluno_id, '-', m.corretor_id))::integer
  FROM public.ajuda_rapida_mensagens m
  JOIN public.corretores c ON m.corretor_id = c.id
  WHERE c.email = corretor_email 
    AND c.ativo = true
    AND m.autor = 'aluno'
    AND m.lida = false;
$function$;

-- 8. Função get_alunos_pendentes
CREATE OR REPLACE FUNCTION public.get_alunos_pendentes()
 RETURNS TABLE(id uuid, nome text, email text, turma text, data_solicitacao timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.turma,
    p.data_solicitacao
  FROM public.profiles p
  WHERE p.user_type = 'aluno' 
    AND p.status_aprovacao = 'pendente'
    AND p.ativo = false
  ORDER BY p.data_solicitacao ASC;
$function$;

-- 9. Função marcar_conversa_como_lida
CREATE OR REPLACE FUNCTION public.marcar_conversa_como_lida(p_aluno_id uuid, p_corretor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.ajuda_rapida_mensagens 
  SET lida = true 
  WHERE aluno_id = p_aluno_id 
    AND corretor_id = p_corretor_id 
    AND autor = 'aluno'
    AND lida = false;
END;
$function$;

-- 10. Função aprovar_aluno
CREATE OR REPLACE FUNCTION public.aprovar_aluno(aluno_id uuid, admin_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem aprovar alunos';
  END IF;

  -- Atualizar status do aluno
  UPDATE public.profiles 
  SET 
    status_aprovacao = 'ativo',
    ativo = true,
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