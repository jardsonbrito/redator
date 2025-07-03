-- Ajustar as políticas RLS para permitir que admins gerenciem perfis de alunos
-- Primeiro, dropar a política restritiva existente se houver
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Criar nova política que permite ao admin principal gerenciar todos os perfis
CREATE POLICY "Main admin can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- Política para permitir que usuários vejam apenas seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id OR is_main_admin());

-- Política para permitir que usuários atualizem apenas seu próprio perfil  
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR is_main_admin())
WITH CHECK (auth.uid() = id OR is_main_admin());