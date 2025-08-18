-- Corrigir políticas RLS para permitir admin acessar frequência
-- Remover políticas problemáticas que causam conflito de permissão
DROP POLICY IF EXISTS "pres_read_own" ON presenca_aulas;
DROP POLICY IF EXISTS "pres_update_own" ON presenca_aulas;
DROP POLICY IF EXISTS "pres_insert_own" ON presenca_aulas;
DROP POLICY IF EXISTS "pres_write_own" ON presenca_aulas;

-- Criar política simples e eficaz para admin
CREATE POLICY "Admin can view all attendance records"
ON presenca_aulas
FOR SELECT
TO authenticated
USING (is_main_admin());

-- Garantir que a política de seleção pública ainda funcione
CREATE POLICY "Public can view attendance records"
ON presenca_aulas
FOR SELECT
TO anon, authenticated
USING (true);