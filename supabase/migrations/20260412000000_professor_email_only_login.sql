-- Remove senha do fluxo de login do professor.
-- A partir de agora, professores acessam apenas com e-mail cadastrado (como aluno/corretor).

CREATE OR REPLACE FUNCTION public.validate_professor_login(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  professor_record public.professores%ROWTYPE;
BEGIN
  -- Busca professor ativo pelo e-mail
  SELECT * INTO professor_record
  FROM public.professores
  WHERE email = LOWER(TRIM(p_email)) AND ativo = true;

  -- E-mail não encontrado ou professor inativo
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'E-mail não encontrado ou acesso inativo.'
    );
  END IF;

  -- Atualiza último acesso
  UPDATE public.professores
  SET ultimo_login = now()
  WHERE id = professor_record.id;

  -- Registra log de acesso
  INSERT INTO public.professor_access_logs (professor_id, acao)
  VALUES (professor_record.id, 'login');

  -- Retorna dados do professor
  RETURN jsonb_build_object(
    'success', true,
    'professor', jsonb_build_object(
      'id',            professor_record.id,
      'nome_completo', professor_record.nome_completo,
      'email',         professor_record.email,
      'role',          professor_record.role,
      'primeiro_login', professor_record.primeiro_login
    )
  );
END;
$$;
