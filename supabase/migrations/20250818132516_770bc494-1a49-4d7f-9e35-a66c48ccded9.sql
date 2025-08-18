-- Create alternative RPC functions that accept email as parameter for compatibility
CREATE OR REPLACE FUNCTION public.registrar_entrada_email_param(p_aula_id uuid, p_email_aluno text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_nome text;
  user_sobrenome text;
BEGIN
  -- Normalize email
  p_email_aluno := LOWER(TRIM(p_email_aluno));
  
  IF p_email_aluno IS NULL OR p_email_aluno = '' THEN
    RETURN 'email_invalido';
  END IF;
  
  -- Try to get name from profiles table
  SELECT nome, sobrenome INTO user_nome, user_sobrenome
  FROM public.profiles 
  WHERE email = p_email_aluno 
  AND user_type = 'aluno'
  LIMIT 1;
  
  -- Fallback to email parts if no profile found
  IF user_nome IS NULL THEN
    user_nome := split_part(p_email_aluno, '@', 1);
    user_sobrenome := '';
  END IF;
  
  -- Check if entry already exists
  IF EXISTS (
    SELECT 1 FROM public.presenca_aulas 
    WHERE aula_id = p_aula_id 
    AND email_aluno = p_email_aluno 
    AND entrada_at IS NOT NULL
  ) THEN
    RETURN 'entrada_ja_registrada';
  END IF;
  
  -- Insert or update attendance record
  INSERT INTO public.presenca_aulas (
    aula_id,
    email_aluno,
    nome_aluno,
    sobrenome_aluno,
    tipo_registro,
    entrada_at,
    data_registro,
    turma
  ) VALUES (
    p_aula_id,
    p_email_aluno,
    user_nome,
    COALESCE(user_sobrenome, ''),
    'entrada',
    now(),
    now(),
    COALESCE((SELECT turma FROM public.profiles WHERE email = p_email_aluno LIMIT 1), 'visitante')
  )
  ON CONFLICT (aula_id, email_aluno) 
  DO UPDATE SET
    entrada_at = now(),
    tipo_registro = 'entrada',
    data_registro = now();
  
  RETURN 'entrada_ok';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'erro_interno';
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_saida_email_param(p_aula_id uuid, p_email_aluno text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  entrada_existente timestamp with time zone;
BEGIN
  -- Normalize email
  p_email_aluno := LOWER(TRIM(p_email_aluno));
  
  IF p_email_aluno IS NULL OR p_email_aluno = '' THEN
    RETURN 'email_invalido';
  END IF;
  
  -- Check if entry exists
  SELECT entrada_at INTO entrada_existente
  FROM public.presenca_aulas 
  WHERE aula_id = p_aula_id 
  AND email_aluno = p_email_aluno;
  
  IF entrada_existente IS NULL THEN
    RETURN 'precisa_entrada';
  END IF;
  
  -- Check if exit already registered
  IF EXISTS (
    SELECT 1 FROM public.presenca_aulas 
    WHERE aula_id = p_aula_id 
    AND email_aluno = p_email_aluno 
    AND saida_at IS NOT NULL
  ) THEN
    RETURN 'saida_ja_registrada';
  END IF;
  
  -- Update with exit time
  UPDATE public.presenca_aulas 
  SET 
    saida_at = now(),
    tipo_registro = 'saida',
    atualizado_em = now()
  WHERE aula_id = p_aula_id 
  AND email_aluno = p_email_aluno;
  
  RETURN 'saida_ok';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'erro_interno';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.registrar_entrada_email_param(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_entrada_email_param(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.registrar_saida_email_param(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_saida_email_param(uuid, text) TO anon;

-- Add policy to allow anonymous access for attendance registration
CREATE POLICY "Allow anonymous attendance insert" 
ON public.presenca_aulas 
FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous attendance update" 
ON public.presenca_aulas 
FOR UPDATE 
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anonymous attendance select" 
ON public.presenca_aulas 
FOR SELECT 
TO anon
USING (true);