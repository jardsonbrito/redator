-- Criar função para migrar dados com segurança
CREATE OR REPLACE FUNCTION public.mark_recorded_lesson_view(
  p_lesson_id text,
  p_student_email text,
  p_student_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Buscar user_id do aluno
  SELECT id INTO target_user_id
  FROM public.profiles 
  WHERE email = LOWER(TRIM(p_student_email)) 
    AND user_type = 'aluno'
  LIMIT 1;
  
  -- Se não encontrar o perfil, ignorar
  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se lesson_id é UUID válido
  IF NOT (p_lesson_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RETURN false;
  END IF;
  
  -- Inserir na tabela (ignorar se já existe)
  INSERT INTO public.recorded_lesson_views (
    lesson_id,
    user_id,
    student_email,
    student_name,
    first_watched_at,
    created_at
  ) VALUES (
    p_lesson_id::uuid,
    target_user_id,
    LOWER(TRIM(p_student_email)),
    p_student_name,
    now(),
    now()
  )
  ON CONFLICT (lesson_id, user_id) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Migrar dados específicos da Antônia
SELECT public.mark_recorded_lesson_view(
  'f0bafc18-f984-4639-b6ca-7465f8964205',
  'anajuliafreitas11222@gmail.com',
  'Antônia Ana Julia Freitas do Carmo'
);

SELECT public.mark_recorded_lesson_view(
  '36053dde-6b74-46cb-a5ce-ae910e168a69',
  'anajuliafreitas11222@gmail.com',
  'Antônia Ana Julia Freitas do Carmo'
);

SELECT public.mark_recorded_lesson_view(
  'fe052167-0773-42f9-8036-950e7bbbf736',
  'anajuliafreitas11222@gmail.com',
  'Antônia Ana Julia Freitas do Carmo'
);

SELECT public.mark_recorded_lesson_view(
  'b334e6b2-6f42-4f93-b773-731e714fd88a',
  'anajuliafreitas11222@gmail.com',
  'Antônia Ana Julia Freitas do Carmo'
);

SELECT public.mark_recorded_lesson_view(
  '5e6412f6-0ff7-43f6-857b-0c0fd76abd71',
  'anajuliafreitas11222@gmail.com',
  'Antônia Ana Julia Freitas do Carmo'
);

SELECT public.mark_recorded_lesson_view(
  'd6e7dc77-b2e3-473a-bf5d-15286361a176',
  'anajuliafreitas11222@gmail.com',
  'Antônia Ana Julia Freitas do Carmo'
);

SELECT public.mark_recorded_lesson_view(
  '6acecc30-267e-4ade-a714-7eb81203d545',
  'anajuliafreitas11222@gmail.com',
  'Antônia Ana Julia Freitas do Carmo'
);