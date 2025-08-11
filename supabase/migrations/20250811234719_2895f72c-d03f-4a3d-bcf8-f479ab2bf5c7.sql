-- Habilitar extensão pgcrypto para funções de criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Corrigir função de teste usando pgcrypto
CREATE OR REPLACE FUNCTION public.test_admin_login(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  auth_result boolean;
  direct_result jsonb;
  auth_user record;
BEGIN
  -- Testar se o usuário existe no auth.users com senha correta
  SELECT * INTO auth_user
  FROM auth.users 
  WHERE email = p_email 
  LIMIT 1;
  
  -- Verificar se existe e se a senha confere (usando crypt do pgcrypto)
  IF auth_user.email IS NOT NULL THEN
    auth_result := auth_user.encrypted_password = crypt(p_password, auth_user.encrypted_password);
  ELSE
    auth_result := false;
  END IF;
  
  -- Testar validação direta
  SELECT public.validate_admin_credentials(p_email, p_password) INTO direct_result;
  
  RETURN jsonb_build_object(
    'email', p_email,
    'auth_user_exists', auth_user.email IS NOT NULL,
    'auth_password_valid', auth_result,
    'direct_validation', direct_result,
    'can_login', auth_result OR (direct_result->>'success')::boolean,
    'auth_user_id', auth_user.id
  );
END;
$$;