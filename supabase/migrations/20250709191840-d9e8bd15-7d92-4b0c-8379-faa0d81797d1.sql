-- Criar função para troca de e-mail sem autenticação
CREATE OR REPLACE FUNCTION public.update_student_email(
  current_email text,
  new_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_user_id uuid;
  result jsonb;
BEGIN
  -- Verificar se o e-mail atual existe
  SELECT id INTO existing_user_id
  FROM public.profiles
  WHERE email = LOWER(TRIM(current_email))
  AND user_type = 'aluno';

  IF existing_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_not_found',
      'message', 'E-mail não encontrado no sistema'
    );
  END IF;

  -- Verificar se o novo e-mail já está em uso
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = LOWER(TRIM(new_email))
    AND id != existing_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_in_use',
      'message', 'O novo e-mail já está sendo usado por outro aluno'
    );
  END IF;

  -- Atualizar o e-mail
  UPDATE public.profiles
  SET 
    email = LOWER(TRIM(new_email)),
    updated_at = now()
  WHERE id = existing_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'E-mail atualizado com sucesso'
  );
END;
$$;