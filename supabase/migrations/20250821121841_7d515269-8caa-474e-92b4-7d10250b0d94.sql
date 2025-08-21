-- Remover funções existentes e recriar com retorno correto
DROP FUNCTION IF EXISTS public.registrar_entrada(text, uuid);
DROP FUNCTION IF EXISTS public.registrar_saida(text, uuid);

-- Recriar função registrar_entrada
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

  -- Inserir ou atualizar presença
  INSERT INTO public.presenca_aulas (
    aluno_id, aula_id, entrada_at, nome_aluno, email_aluno, 
    turma, tipo_registro, data_registro, criado_em, atualizado_em
  )
  VALUES (
    v_aluno_id, p_aula_id, now(), v_nome_aluno, p_email, 
    v_turma_aluno, 'entrada', now(), now(), now()
  )
  ON CONFLICT (aluno_id, aula_id) DO UPDATE
    SET entrada_at = COALESCE(presenca_aulas.entrada_at, EXCLUDED.entrada_at),
        atualizado_em = now(),
        tipo_registro = 'entrada'
  RETURNING 
    presenca_aulas.aluno_id, 
    presenca_aulas.aula_id, 
    presenca_aulas.entrada_at, 
    presenca_aulas.saida_at
  INTO result_record;

  -- Retornar os valores
  RETURN QUERY VALUES (
    result_record.aluno_id, 
    result_record.aula_id, 
    result_record.entrada_at, 
    result_record.saida_at
  );
END;
$function$;

-- Recriar função registrar_saida
CREATE OR REPLACE FUNCTION public.registrar_saida(p_email text, p_aula_id uuid)
RETURNS TABLE(aluno_id uuid, aula_id uuid, entrada_at timestamp with time zone, saida_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE 
  v_aluno_id uuid;
  result_record record;
BEGIN
  -- Buscar aluno pelo email nos profiles
  SELECT profiles.id 
  INTO v_aluno_id 
  FROM public.profiles 
  WHERE LOWER(TRIM(profiles.email)) = LOWER(TRIM(p_email)) 
    AND profiles.user_type = 'aluno' 
    AND profiles.ativo = true 
  LIMIT 1;
  
  IF v_aluno_id IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado para email: %', p_email USING ERRCODE = 'P0001';
  END IF;

  -- Atualizar saída se há entrada registrada
  UPDATE public.presenca_aulas
  SET saida_at = COALESCE(presenca_aulas.saida_at, now()), 
      atualizado_em = now(),
      tipo_registro = 'saida'
  WHERE presenca_aulas.aluno_id = v_aluno_id 
    AND presenca_aulas.aula_id = p_aula_id
  RETURNING 
    presenca_aulas.aluno_id, 
    presenca_aulas.aula_id, 
    presenca_aulas.entrada_at, 
    presenca_aulas.saida_at
  INTO result_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não há entrada registrada para registrar saída' USING ERRCODE = 'P0001';
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