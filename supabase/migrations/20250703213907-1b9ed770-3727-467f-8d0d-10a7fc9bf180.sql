-- CORREÇÃO 6: Padronizar todas as políticas que misturam 'public' e 'authenticated'
-- Avisos
DROP POLICY IF EXISTS "Admin pode gerenciar avisos" ON avisos;
CREATE POLICY "Admin can manage avisos" 
ON avisos 
FOR ALL 
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());

DROP POLICY IF EXISTS "Admin pode ver todas as leituras" ON avisos_leitura;
CREATE POLICY "Admin can manage avisos_leitura" 
ON avisos_leitura 
FOR ALL 
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- CORREÇÃO 7: Padronizar políticas com diferentes funções admin (is_admin_user vs is_main_admin)
DROP POLICY IF EXISTS "Admins can manage all simulados" ON simulados;
CREATE POLICY "Admin can manage simulados" 
ON simulados 
FOR ALL 
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- CORREÇÃO 8: Corrigir políticas de redacoes com EXISTS complexos
DROP POLICY IF EXISTS "Admins podem atualizar redações" ON redacoes;
DROP POLICY IF EXISTS "Admins podem deletar redações" ON redacoes;
DROP POLICY IF EXISTS "Admins podem inserir redações" ON redacoes;

CREATE POLICY "Admin can manage redacoes" 
ON redacoes 
FOR ALL 
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());