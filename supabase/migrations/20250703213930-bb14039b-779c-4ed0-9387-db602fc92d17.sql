-- CORREÇÃO 9: Padronizar políticas de temas e vídeos
DROP POLICY IF EXISTS "Admins podem atualizar temas" ON temas;
DROP POLICY IF EXISTS "Admins podem deletar temas" ON temas;
DROP POLICY IF EXISTS "Admins podem inserir temas" ON temas;

CREATE POLICY "Admin can manage temas" 
ON temas 
FOR ALL 
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());

DROP POLICY IF EXISTS "Admins podem atualizar vídeos" ON videos;
DROP POLICY IF EXISTS "Admins podem deletar vídeos" ON videos;
DROP POLICY IF EXISTS "Admins podem inserir vídeos" ON videos;

CREATE POLICY "Admin can manage videos" 
ON videos 
FOR ALL 
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- CORREÇÃO 10: Garantir que importacao_csv usa roles corretos
DROP POLICY IF EXISTS "Apenas admin pode gerenciar importações" ON importacao_csv;
CREATE POLICY "Admin can manage importacao_csv" 
ON importacao_csv 
FOR ALL 
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- CORREÇÃO 11: Verificar se função is_app_admin existe ou substituir por is_main_admin
DROP POLICY IF EXISTS "Admin pode ver toda presença" ON presenca_aulas;
CREATE POLICY "Admin can manage presenca_aulas" 
ON presenca_aulas 
FOR ALL 
TO authenticated
USING (is_main_admin())
WITH CHECK (is_main_admin());