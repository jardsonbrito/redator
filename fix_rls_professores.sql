-- Fix RLS policies for professores table to allow read access
-- Execute no SQL Editor do Supabase

-- 1. Verificar se RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'professores';

-- 2. Listar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'professores';

-- 3. Criar política para permitir professores lerem seus próprios dados
DO $$
BEGIN
  -- Drop policy if exists
  DROP POLICY IF EXISTS "Professores podem ler seus próprios dados" ON professores;

  -- Create new policy
  CREATE POLICY "Professores podem ler seus próprios dados"
  ON professores
  FOR SELECT
  USING (true);  -- Allow all reads for now, you can restrict later if needed
END $$;

-- 4. Verificar se policy foi criada
SELECT policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'professores'
  AND policyname = 'Professores podem ler seus próprios dados';
