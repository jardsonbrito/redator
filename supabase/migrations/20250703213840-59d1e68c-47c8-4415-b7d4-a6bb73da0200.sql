-- CORREÇÃO 3: Corrigir políticas conflitantes na tabela profiles
DROP POLICY IF EXISTS "Permitir inserção de perfis" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Política única e segura para inserção de perfis
CREATE POLICY "Allow profile insertion" 
ON profiles 
FOR INSERT 
TO public
WITH CHECK (true);

-- CORREÇÃO 4: Limpar políticas duplicadas de redacoes_simulado
DROP POLICY IF EXISTS "Admin can manage all redacoes_simulado" ON redacoes_simulado;
DROP POLICY IF EXISTS "Admin full simulado management" ON redacoes_simulado;

-- Política única para admin gerenciar simulados
CREATE POLICY "Admin can manage redacoes_simulado" 
ON redacoes_simulado 
FOR ALL 
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- CORREÇÃO 5: Padronizar roles nas políticas (algumas estão usando 'public' outras 'authenticated')
-- Corrigir radar_dados que está usando 'public' mas deveria ser 'authenticated'
DROP POLICY IF EXISTS "Apenas admin pode atualizar dados do radar" ON radar_dados;
DROP POLICY IF EXISTS "Apenas admin pode deletar dados do radar" ON radar_dados;
DROP POLICY IF EXISTS "Apenas admin pode inserir dados do radar" ON radar_dados;
DROP POLICY IF EXISTS "Apenas admin pode ver dados do radar" ON radar_dados;

-- Recriar políticas do radar com roles corretos
CREATE POLICY "Admin can manage radar_dados" 
ON radar_dados 
FOR ALL 
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());