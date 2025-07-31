-- Finalizar as últimas 9 funções que faltam

CREATE OR REPLACE FUNCTION public.atualizar_professor(professor_id uuid, p_nome_completo text, p_email text, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Verificar se é admin
  IF NOT public.is_main_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'access_denied',
      'message', 'Acesso negado: apenas administradores podem atualizar professores'
    );
  END IF;
  
  -- Verificar se email já existe em outro professor
  IF EXISTS (
    SELECT 1 FROM public.professores 
    WHERE email = LOWER(TRIM(p_email)) 
    AND id != professor_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_exists',
      'message', 'Este e-mail já está sendo usado por outro professor'
    );
  END IF;
  
  -- Atualizar professor
  UPDATE public.professores 
  SET 
    nome_completo = TRIM(p_nome_completo),
    email = LOWER(TRIM(p_email)),
    role = p_role,
    atualizado_em = now()
  WHERE id = professor_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Professor atualizado com sucesso'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'professor_not_found',
      'message', 'Professor não encontrado'
    );
  END IF;
END;
$function$;