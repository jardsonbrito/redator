-- Corrigir verificação de admin e políticas RLS para presenca_aulas

-- 1. Atualizar função is_main_admin para ser mais robusta
CREATE OR REPLACE FUNCTION public.is_main_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(auth.email() = 'jardsonbrito@gmail.com', false);
$$;

-- 2. Criar função específica para verificar admin na context de aplicação
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    auth.email() = 'jardsonbrito@gmail.com' OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND email = 'jardsonbrito@gmail.com'
    ), 
    false
  );
$$;

-- 3. Atualizar política de presença para admin
DROP POLICY IF EXISTS "Admin pode ver toda presença" ON public.presenca_aulas;
CREATE POLICY "Admin pode ver toda presença"
ON public.presenca_aulas
FOR ALL
TO authenticated
USING (is_app_admin())
WITH CHECK (is_app_admin());

-- 4. Garantir que a query funcione mesmo sem autenticação
DROP POLICY IF EXISTS "Acesso público limitado para presença" ON public.presenca_aulas;
CREATE POLICY "Acesso público limitado para presença"
ON public.presenca_aulas
FOR SELECT
TO anon, authenticated
USING (true);