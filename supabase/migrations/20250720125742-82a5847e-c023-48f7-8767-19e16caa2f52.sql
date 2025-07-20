-- Função para contar mensagens não lidas para aluno
CREATE OR REPLACE FUNCTION public.contar_mensagens_nao_lidas_aluno(aluno_email text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  aluno_id_val uuid;
  count_val integer;
BEGIN
  -- Buscar o ID do aluno pelo email
  SELECT id INTO aluno_id_val
  FROM public.profiles 
  WHERE email = LOWER(TRIM(aluno_email)) 
    AND user_type = 'aluno'
  LIMIT 1;
  
  -- Se não encontrar o aluno, retornar 0
  IF aluno_id_val IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Contar mensagens não lidas enviadas pelos corretores para este aluno
  SELECT COUNT(*)::integer INTO count_val
  FROM public.ajuda_rapida_mensagens 
  WHERE aluno_id = aluno_id_val 
    AND autor = 'corretor'
    AND lida = false;
  
  RETURN COALESCE(count_val, 0);
END;
$$;