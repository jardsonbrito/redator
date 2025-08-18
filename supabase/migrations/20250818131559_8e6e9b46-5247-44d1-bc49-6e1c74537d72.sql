-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.registrar_entrada_email(uuid, text);
DROP FUNCTION IF EXISTS public.registrar_entrada_email(uuid);
DROP FUNCTION IF EXISTS public.registrar_saida_email(uuid, text);
DROP FUNCTION IF EXISTS public.registrar_saida_email(uuid);

-- Create the correct RPC functions using auth.jwt() to get email
CREATE OR REPLACE FUNCTION public.registrar_entrada_email(p_aula_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_email text;
  user_nome text;
  user_sobrenome text;
BEGIN
  -- Get email from auth token
  user_email := (auth.jwt() ->> 'email')::text;
  
  IF user_email IS NULL THEN
    RETURN 'usuario_nao_autenticado';
  END IF;
  
  -- Try to get name from profiles table
  SELECT nome, sobrenome INTO user_nome, user_sobrenome
  FROM public.profiles 
  WHERE email = user_email 
  AND user_type = 'aluno'
  LIMIT 1;
  
  -- Fallback to email parts if no profile found
  IF user_nome IS NULL THEN
    user_nome := split_part(user_email, '@', 1);
    user_sobrenome := '';
  END IF;
  
  -- Check if entry already exists
  IF EXISTS (
    SELECT 1 FROM public.presenca_aulas 
    WHERE aula_id = p_aula_id 
    AND email_aluno = user_email 
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
    user_email,
    user_nome,
    COALESCE(user_sobrenome, ''),
    'entrada',
    now(),
    now(),
    COALESCE((SELECT turma FROM public.profiles WHERE email = user_email LIMIT 1), 'visitante')
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

CREATE OR REPLACE FUNCTION public.registrar_saida_email(p_aula_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_email text;
  user_nome text;
  user_sobrenome text;
  entrada_existente timestamp with time zone;
BEGIN
  -- Get email from auth token
  user_email := (auth.jwt() ->> 'email')::text;
  
  IF user_email IS NULL THEN
    RETURN 'usuario_nao_autenticado';
  END IF;
  
  -- Check if entry exists
  SELECT entrada_at INTO entrada_existente
  FROM public.presenca_aulas 
  WHERE aula_id = p_aula_id 
  AND email_aluno = user_email;
  
  IF entrada_existente IS NULL THEN
    RETURN 'precisa_entrada';
  END IF;
  
  -- Check if exit already registered
  IF EXISTS (
    SELECT 1 FROM public.presenca_aulas 
    WHERE aula_id = p_aula_id 
    AND email_aluno = user_email 
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
  AND email_aluno = user_email;
  
  RETURN 'saida_ok';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'erro_interno';
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.registrar_entrada_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_saida_email(uuid) TO authenticated;

-- Ensure RLS is enabled on presenca_aulas
ALTER TABLE public.presenca_aulas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "pres_read_own" ON public.presenca_aulas;
DROP POLICY IF EXISTS "pres_insert_own" ON public.presenca_aulas;
DROP POLICY IF EXISTS "pres_update_own" ON public.presenca_aulas;

-- Create clean RLS policies
CREATE POLICY "pres_read_own" 
ON public.presenca_aulas 
FOR SELECT 
USING (email_aluno = (auth.jwt() ->> 'email'::text));

CREATE POLICY "pres_insert_own" 
ON public.presenca_aulas 
FOR INSERT 
WITH CHECK (email_aluno = (auth.jwt() ->> 'email'::text));

CREATE POLICY "pres_update_own" 
ON public.presenca_aulas 
FOR UPDATE 
USING (email_aluno = (auth.jwt() ->> 'email'::text))
WITH CHECK (email_aluno = (auth.jwt() ->> 'email'::text));