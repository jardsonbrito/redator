-- Corrigir problema de login para teste@gmail.com
-- Remover usuário existente com senha incorreta
DELETE FROM auth.users WHERE email = 'teste@gmail.com';

-- Recriar usuário com senha correta usando crypt
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
  (SELECT id FROM public.admin_users WHERE email = 'teste@gmail.com'),
  'teste@gmail.com',
  crypt('123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object('nome_completo', 'Usuario Teste'),
  false,
  'authenticated'
);

-- Melhorar função de sincronização para usar crypt corretamente
CREATE OR REPLACE FUNCTION public.sync_admin_to_auth_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar usuário existente se houver
  DELETE FROM auth.users WHERE email = NEW.email;
  
  -- Criar novo usuário com senha hasheada corretamente
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
    NEW.id,
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
  
  RETURN NEW;
END;
$$;

-- Função para validar se login está funcionando
CREATE OR REPLACE FUNCTION public.test_admin_login(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  auth_result boolean;
  direct_result jsonb;
BEGIN
  -- Testar se o usuário existe no auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = p_email 
    AND encrypted_password = crypt(p_password, encrypted_password)
  ) INTO auth_result;
  
  -- Testar validação direta
  SELECT public.validate_admin_credentials(p_email, p_password) INTO direct_result;
  
  RETURN jsonb_build_object(
    'email', p_email,
    'auth_users_valid', auth_result,
    'direct_validation', direct_result,
    'can_login', auth_result OR (direct_result->>'success')::boolean
  );
END;
$$;