-- Atualizar função is_main_admin para consultar admin_users primeiro
CREATE OR REPLACE FUNCTION public.is_main_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT COALESCE(
    -- Verificar sistema novo (tabela admin_users) primeiro
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE email = auth.email() AND ativo = true
    ) OR
    -- Verificar sistema antigo (hardcoded) como fallback - mantido para compatibilidade
    auth.email() = 'jardsonbrito@gmail.com' OR 
    auth.email() = 'jarvisluz@gmail.com',
    false
  );
$function$;

-- Criar usuário teste@gmail.com no Supabase Auth
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'teste@gmail.com',
  crypt('123456', gen_salt('bf')), -- Hash da senha
  now(), -- Email já confirmado
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object('email', 'teste@gmail.com'),
  false,
  'authenticated'
);

-- Função para sincronizar criação de admins no auth.users
CREATE OR REPLACE FUNCTION public.sync_admin_to_auth_users()
 RETURNS TRIGGER
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Só criar no auth.users se não existir
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.email) THEN
    INSERT INTO auth.users (
      id,
      email, 
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role
    ) VALUES (
      NEW.id, -- Usar o mesmo ID
      NEW.email,
      crypt(NEW.password_hash, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('nome_completo', NEW.nome_completo),
      false,
      'authenticated'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger para sincronização automática
CREATE TRIGGER sync_admin_users_to_auth
  AFTER INSERT ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_admin_to_auth_users();