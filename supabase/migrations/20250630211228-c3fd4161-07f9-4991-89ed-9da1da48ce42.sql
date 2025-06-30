
-- Fix the RLS policies for simulados table
-- Remove existing problematic policies
DROP POLICY IF EXISTS "Admins podem inserir simulados" ON public.simulados;
DROP POLICY IF EXISTS "Admins podem gerenciar simulados" ON public.simulados;
DROP POLICY IF EXISTS "Simulados ativos são visíveis para todos" ON public.simulados;

-- Create new simplified policies that don't reference the auth.users table directly
-- Policy for viewing active simulados (no authentication required)
CREATE POLICY "Anyone can view active simulados" 
  ON public.simulados 
  FOR SELECT 
  USING (ativo = true);

-- Policy for admin management using the existing safe function
CREATE POLICY "Admins can manage all simulados" 
  ON public.simulados 
  FOR ALL 
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Ensure the admin function exists and works correctly
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT auth.email() = 'jardsonbrito@gmail.com';
$$;
