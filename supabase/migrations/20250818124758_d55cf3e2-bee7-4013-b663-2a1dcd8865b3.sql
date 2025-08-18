-- Atualizar RPCs para usar email do usuário autenticado automaticamente

-- Remover funções existentes
DROP FUNCTION IF EXISTS public.registrar_entrada_email(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.registrar_saida_email(uuid, text);

-- Criar RPC para registrar entrada (usa email do auth automaticamente)
CREATE OR REPLACE FUNCTION public.registrar_entrada_email(p_aula_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
  user_name text;
BEGIN
  -- Obter email do usuário autenticado
  SELECT auth.email() INTO user_email;
  
  IF user_email IS NULL THEN
    RETURN 'usuario_nao_autenticado';
  END IF;
  
  -- Tentar obter nome do usuário (fallback para email)
  user_name := COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE email = user_email),
    split_part(user_email, '@', 1)
  );
  
  -- Inserir usando UPSERT por (aula_id, email_aluno)
  INSERT INTO public.presenca_aulas (
    aula_id,
    email_aluno,
    nome_aluno,
    turma,
    entrada_at
  ) VALUES (
    p_aula_id,
    user_email,
    user_name,
    'Aluno',
    now()
  )
  ON CONFLICT (aula_id, email_aluno) 
  DO UPDATE SET
    entrada_at = COALESCE(presenca_aulas.entrada_at, now()),
    nome_aluno = EXCLUDED.nome_aluno;
    
  RETURN 'entrada_ok';
END;
$$;

-- Criar RPC para registrar saída (usa email do auth automaticamente)
CREATE OR REPLACE FUNCTION public.registrar_saida_email(p_aula_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
  entrada_exists boolean;
  saida_exists boolean;
BEGIN
  -- Obter email do usuário autenticado
  SELECT auth.email() INTO user_email;
  
  IF user_email IS NULL THEN
    RETURN 'usuario_nao_autenticado';
  END IF;
  
  -- Verificar se existe entrada e se já tem saída
  SELECT 
    (entrada_at IS NOT NULL) as has_entrada,
    (saida_at IS NOT NULL) as has_saida
  INTO entrada_exists, saida_exists
  FROM public.presenca_aulas
  WHERE aula_id = p_aula_id AND email_aluno = user_email;
  
  -- Se não encontrou registro, precisa registrar entrada primeiro
  IF NOT FOUND THEN
    RETURN 'precisa_entrada';
  END IF;
  
  -- Se não tem entrada, não pode registrar saída
  IF NOT entrada_exists THEN
    RETURN 'precisa_entrada';
  END IF;
  
  -- Se já tem saída registrada
  IF saida_exists THEN
    RETURN 'saida_ja_registrada';
  END IF;
  
  -- Atualizar com saída
  UPDATE public.presenca_aulas
  SET saida_at = now()
  WHERE aula_id = p_aula_id AND email_aluno = user_email;
  
  RETURN 'saida_ok';
END;
$$;