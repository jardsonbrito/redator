-- Criar tabela admin_users para gerenciar credenciais de admin dinamicamente
CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  nome_completo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  ultimo_login timestamp with time zone,
  criado_por uuid
);

-- Habilitar RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem gerenciar admin_users
CREATE POLICY "Admin can manage admin_users" 
ON public.admin_users 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- Trigger para atualizar data de modificação
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir admins atuais na tabela (migrando do hardcoded)
INSERT INTO public.admin_users (email, password_hash, nome_completo, criado_por) VALUES
('jardsonbrito@gmail.com', 'temp_hash_123', 'Jardson Brito', (SELECT id FROM auth.users WHERE email = 'jardsonbrito@gmail.com' LIMIT 1)),
('jarvisluz@gmail.com', 'temp_hash_123', 'Jarvis Luz', (SELECT id FROM auth.users WHERE email = 'jarvisluz@gmail.com' LIMIT 1));

-- Atualizar função is_main_admin para verificar ambos os sistemas (hardcoded + tabela)
CREATE OR REPLACE FUNCTION public.is_main_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(
    -- Verificar sistema antigo (hardcoded) - mantido para compatibilidade
    auth.email() = 'jardsonbrito@gmail.com' OR 
    auth.email() = 'jarvisluz@gmail.com' OR
    -- Verificar sistema novo (tabela admin_users)
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE email = auth.email() AND ativo = true
    ),
    false
  );
$function$;

-- Criar função para validar credenciais de admin
CREATE OR REPLACE FUNCTION public.validate_admin_credentials(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  admin_record record;
BEGIN
  -- Buscar admin por email
  SELECT * INTO admin_record
  FROM public.admin_users 
  WHERE email = LOWER(TRIM(p_email)) 
  AND ativo = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_credentials',
      'message', 'Email ou senha inválidos'
    );
  END IF;
  
  -- Por enquanto comparação simples (depois implementar bcrypt)
  IF admin_record.password_hash != p_password THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_credentials', 
      'message', 'Email ou senha inválidos'
    );
  END IF;
  
  -- Atualizar último login
  UPDATE public.admin_users 
  SET ultimo_login = now()
  WHERE id = admin_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'admin', jsonb_build_object(
      'id', admin_record.id,
      'email', admin_record.email,
      'nome_completo', admin_record.nome_completo
    )
  );
END;
$function$;

-- Criar função para alterar email de admin
CREATE OR REPLACE FUNCTION public.update_admin_email(p_admin_id uuid, p_new_email text, p_current_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  admin_record record;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'access_denied',
      'message', 'Acesso negado'
    );
  END IF;
  
  -- Buscar admin atual
  SELECT * INTO admin_record
  FROM public.admin_users 
  WHERE id = p_admin_id AND ativo = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'admin_not_found',
      'message', 'Admin não encontrado'
    );
  END IF;
  
  -- Verificar senha atual
  IF admin_record.password_hash != p_current_password THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_password',
      'message', 'Senha atual incorreta'
    );
  END IF;
  
  -- Verificar se novo email já existe
  IF EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = LOWER(TRIM(p_new_email)) 
    AND id != p_admin_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_exists',
      'message', 'Este e-mail já está sendo usado'
    );
  END IF;
  
  -- Atualizar email
  UPDATE public.admin_users 
  SET 
    email = LOWER(TRIM(p_new_email)),
    atualizado_em = now()
  WHERE id = p_admin_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email atualizado com sucesso'
  );
END;
$function$;

-- Criar função para alterar senha de admin
CREATE OR REPLACE FUNCTION public.update_admin_password(p_admin_id uuid, p_current_password text, p_new_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  admin_record record;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'access_denied',
      'message', 'Acesso negado'
    );
  END IF;
  
  -- Buscar admin atual
  SELECT * INTO admin_record
  FROM public.admin_users 
  WHERE id = p_admin_id AND ativo = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'admin_not_found',
      'message', 'Admin não encontrado'
    );
  END IF;
  
  -- Verificar senha atual
  IF admin_record.password_hash != p_current_password THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_password',
      'message', 'Senha atual incorreta'
    );
  END IF;
  
  -- Atualizar senha (por enquanto simples, depois implementar hash seguro)
  UPDATE public.admin_users 
  SET 
    password_hash = p_new_password,
    atualizado_em = now()
  WHERE id = p_admin_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Senha atualizada com sucesso'
  );
END;
$function$;

-- Criar tabela de log de alterações de admin
CREATE TABLE public.admin_config_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES public.admin_users(id),
  acao text NOT NULL,
  detalhes jsonb,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet
);

-- Habilitar RLS na tabela de logs
ALTER TABLE public.admin_config_logs ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ver os logs
CREATE POLICY "Admin can view config logs" 
ON public.admin_config_logs 
FOR SELECT 
USING (is_main_admin());