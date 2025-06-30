
-- Criar função segura para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'jardsonbrito@gmail.com'
  );
$$;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Admins podem inserir simulados" ON public.simulados;
DROP POLICY IF EXISTS "Admins podem gerenciar simulados" ON public.simulados;
DROP POLICY IF EXISTS "Simulados ativos são visíveis para todos" ON public.simulados;

-- Criar política para permitir que admins insiram simulados usando função segura
CREATE POLICY "Admins podem inserir simulados" 
  ON public.simulados 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin_user());

-- Criar política para permitir que admins vejam e editem todos os simulados
CREATE POLICY "Admins podem gerenciar simulados" 
  ON public.simulados 
  FOR ALL 
  TO authenticated
  USING (public.is_admin_user());

-- Política para usuários visualizarem simulados ativos
CREATE POLICY "Simulados ativos são visíveis para todos" 
  ON public.simulados 
  FOR SELECT 
  USING (ativo = true);
