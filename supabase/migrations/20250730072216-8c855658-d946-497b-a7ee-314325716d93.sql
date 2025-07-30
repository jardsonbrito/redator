-- Atualizar função criar_professor para também criar usuário no Supabase Auth
CREATE OR REPLACE FUNCTION public.criar_professor_com_auth(
  p_nome_completo text, 
  p_email text, 
  p_role text DEFAULT 'professor'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_user_id uuid;
  auth_user_response jsonb;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'access_denied',
      'message', 'Acesso negado: apenas administradores podem criar professores'
    );
  END IF;
  
  -- Verificar se email já existe na tabela professores
  IF EXISTS (SELECT 1 FROM public.professores WHERE email = LOWER(TRIM(p_email))) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_exists',
      'message', 'Este e-mail já está sendo usado por outro professor'
    );
  END IF;
  
  -- Criar usuário no Supabase Auth usando admin API
  -- Primeiro, tentamos criar o usuário usando a API administrativa
  SELECT auth.uid() INTO new_user_id;
  
  -- Gerar um UUID para o novo usuário
  new_user_id := gen_random_uuid();
  
  -- Inserir diretamente na tabela auth.users (método interno)
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
    new_user_id,
    LOWER(TRIM(p_email)),
    crypt('123456', gen_salt('bf')), -- Hash da senha padrão
    now(), -- Email já confirmado
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('nome_completo', TRIM(p_nome_completo)),
    false,
    'authenticated'
  );
  
  -- Inserir novo professor na tabela professores
  INSERT INTO public.professores (
    id,
    nome_completo,
    email,
    role,
    senha_hash,
    primeiro_login,
    ativo
  ) VALUES (
    new_user_id,
    TRIM(p_nome_completo),
    LOWER(TRIM(p_email)),
    p_role,
    '123456',
    true,
    true
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Professor criado com sucesso',
    'user_id', new_user_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'creation_failed',
      'message', 'Erro ao criar professor: ' || SQLERRM
    );
END;
$function$;