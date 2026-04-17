-- Fix: sincroniza o hash de senha do admin_users → auth.users após validação bem-sucedida.
-- Isso garante que supabase.auth.signInWithPassword sempre funciona, permitindo que
-- auth.email() retorne o email correto nas políticas RLS.

CREATE OR REPLACE FUNCTION public.validate_admin_credentials(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  admin_record record;
BEGIN
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

  -- Suporte a dois formatos:
  -- 1. Hash bcrypt (começa com $2a$ ou $2b$) → comparação via crypt()
  -- 2. Texto puro legado → comparação direta (para migração)
  IF admin_record.password_hash LIKE '$2%' THEN
    IF extensions.crypt(p_password, admin_record.password_hash) != admin_record.password_hash THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'invalid_credentials',
        'message', 'Email ou senha inválidos'
      );
    END IF;
  ELSE
    IF admin_record.password_hash != p_password THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'invalid_credentials',
        'message', 'Email ou senha inválidos'
      );
    END IF;
  END IF;

  -- Atualiza último login
  UPDATE public.admin_users
  SET ultimo_login = now()
  WHERE id = admin_record.id;

  -- Sincroniza o hash de senha para auth.users para que signInWithPassword funcione.
  -- Necessário quando o admin troca a senha no painel sem atualizar o Supabase Auth.
  IF admin_record.password_hash LIKE '$2%' THEN
    UPDATE auth.users
    SET encrypted_password = admin_record.password_hash
    WHERE email = LOWER(TRIM(p_email));
  END IF;

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
