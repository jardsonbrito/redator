-- Remove foreign key constraint that's causing the issue
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Update the create_simple_profile function to work without auth dependency
CREATE OR REPLACE FUNCTION public.create_simple_profile(
  p_nome text,
  p_email text,
  p_turma text
)
RETURNS TABLE(
  id uuid,
  nome text,
  sobrenome text,
  email text,
  turma text,
  user_type text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_profile_id uuid;
BEGIN
  -- Generate a new UUID for the profile
  new_profile_id := gen_random_uuid();
  
  -- Insert the new profile without foreign key dependency
  INSERT INTO public.profiles (id, nome, sobrenome, email, turma, user_type, created_at, updated_at)
  VALUES (
    new_profile_id,
    p_nome,
    '',
    p_email,
    p_turma,
    'aluno',
    now(),
    now()
  );
  
  -- Return the created profile
  RETURN QUERY
  SELECT 
    pr.id,
    pr.nome,
    pr.sobrenome,
    pr.email,
    pr.turma,
    pr.user_type,
    pr.created_at,
    pr.updated_at
  FROM public.profiles pr
  WHERE pr.id = new_profile_id;
END;
$$;