-- Simplificar função para evitar ambiguidade usando abordagem separada
DROP FUNCTION IF EXISTS public.registrar_entrada(text, uuid);

CREATE OR REPLACE FUNCTION public.registrar_entrada(p_email text, p_aula_id uuid)
RETURNS TABLE(aluno_id uuid, aula_id uuid, entrada_at timestamp with time zone, saida_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE 
  v_aluno_id uuid;
  v_nome_aluno text;
  v_turma_aluno text;
  existing_record record;
  result_record record;
BEGIN
  -- Buscar aluno pelo email nos profiles
  SELECT profiles.id, profiles.nome, profiles.turma 
  INTO v_aluno_id, v_nome_aluno, v_turma_aluno
  FROM public.profiles 
  WHERE LOWER(TRIM(profiles.email)) = LOWER(TRIM(p_email)) 
    AND profiles.user_type = 'aluno' 
    AND profiles.ativo = true 
  LIMIT 1;
  
  IF v_aluno_id IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado para email: %', p_email USING ERRCODE = 'P0001';
  END IF;

  -- Verificar se já existe registro
  SELECT * INTO existing_record
  FROM public.presenca_aulas
  WHERE email_aluno = p_email AND aula_id = p_aula_id;

  IF FOUND THEN
    -- Atualizar registro existente mantendo entrada se já tiver
    UPDATE public.presenca_aulas
    SET entrada_at = COALESCE(entrada_at, now()),
        atualizado_em = now(),
        tipo_registro = 'entrada'
    WHERE email_aluno = p_email AND aula_id = p_aula_id
    RETURNING * INTO result_record;
  ELSE
    -- Inserir novo registro
    INSERT INTO public.presenca_aulas (
      aluno_id, aula_id, entrada_at, nome_aluno, email_aluno, 
      turma, tipo_registro, data_registro, criado_em, atualizado_em
    )
    VALUES (
      v_aluno_id, p_aula_id, now(), v_nome_aluno, p_email, 
      v_turma_aluno, 'entrada', now(), now(), now()
    )
    RETURNING * INTO result_record;
  END IF;

  -- Retornar os valores
  RETURN QUERY VALUES (
    result_record.aluno_id, 
    result_record.aula_id, 
    result_record.entrada_at, 
    result_record.saida_at
  );
END;
$function$;