-- Criar função para criar novo administrador
CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_nome_completo text,
  p_email text,
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'access_denied',
      'message', 'Acesso negado: apenas administradores podem criar outros administradores'
    );
  END IF;
  
  -- Verificar se email já existe
  IF EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = LOWER(TRIM(p_email))
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_exists',
      'message', 'Este e-mail já está sendo usado por outro administrador'
    );
  END IF;
  
  -- Criar novo admin
  INSERT INTO public.admin_users (
    nome_completo,
    email,
    password_hash,
    criado_por
  ) VALUES (
    TRIM(p_nome_completo),
    LOWER(TRIM(p_email)),
    p_password,
    (SELECT id FROM public.admin_users WHERE email = auth.email() LIMIT 1)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Administrador criado com sucesso'
  );
END;
$function$;

-- Criar função para listar administradores
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE(
  id uuid,
  nome_completo text,
  email text,
  ativo boolean,
  criado_em timestamp with time zone,
  ultimo_login timestamp with time zone,
  criado_por_nome text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    a.id,
    a.nome_completo,
    a.email,
    a.ativo,
    a.criado_em,
    a.ultimo_login,
    c.nome_completo as criado_por_nome
  FROM public.admin_users a
  LEFT JOIN public.admin_users c ON a.criado_por = c.id
  WHERE public.is_main_admin()
  ORDER BY a.criado_em DESC;
$function$;

-- Criar função para alternar status do admin
CREATE OR REPLACE FUNCTION public.toggle_admin_status(
  p_admin_id uuid,
  p_new_status boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_admin_id uuid;
  target_admin record;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'access_denied',
      'message', 'Acesso negado'
    );
  END IF;
  
  -- Buscar ID do admin atual
  SELECT id INTO current_admin_id
  FROM public.admin_users 
  WHERE email = auth.email() AND ativo = true
  LIMIT 1;
  
  -- Buscar admin alvo
  SELECT * INTO target_admin
  FROM public.admin_users 
  WHERE id = p_admin_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'admin_not_found',
      'message', 'Administrador não encontrado'
    );
  END IF;
  
  -- Impedir auto-desativação
  IF current_admin_id = p_admin_id AND p_new_status = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'self_deactivation',
      'message', 'Você não pode desativar sua própria conta'
    );
  END IF;
  
  -- Atualizar status
  UPDATE public.admin_users 
  SET 
    ativo = p_new_status,
    atualizado_em = now()
  WHERE id = p_admin_id;
  
  -- Registrar log
  INSERT INTO public.admin_config_logs (
    admin_id,
    acao,
    detalhes
  ) VALUES (
    current_admin_id,
    CASE WHEN p_new_status THEN 'admin_activated' ELSE 'admin_deactivated' END,
    jsonb_build_object(
      'target_admin_id', p_admin_id,
      'target_admin_email', target_admin.email,
      'new_status', p_new_status
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN p_new_status THEN 'Administrador ativado com sucesso'
      ELSE 'Administrador desativado com sucesso'
    END
  );
END;
$function$;