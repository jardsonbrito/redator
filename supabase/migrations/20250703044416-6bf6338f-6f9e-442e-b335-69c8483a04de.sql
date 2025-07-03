-- 🔒 CORREÇÃO CRÍTICA: Função can_access_redacao retornando null em vez de false
DROP FUNCTION IF EXISTS public.can_access_redacao(text, text);

CREATE OR REPLACE FUNCTION public.can_access_redacao(redacao_email text, user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN redacao_email IS NULL OR user_email IS NULL THEN false
      WHEN LOWER(TRIM(redacao_email)) = LOWER(TRIM(user_email)) THEN true
      WHEN public.is_main_admin() THEN true
      ELSE false
    END;
$$;