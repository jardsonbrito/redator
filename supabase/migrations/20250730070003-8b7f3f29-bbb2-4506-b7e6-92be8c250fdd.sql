-- Atualizar função is_main_admin para aceitar múltiplos emails
CREATE OR REPLACE FUNCTION public.is_main_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    auth.email() = 'jardsonbrito@gmail.com' OR 
    auth.email() = 'jarvisluz@gmail.com', 
    false
  );
$$;