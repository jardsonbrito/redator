-- Fix RLS policies for turmas_professores and professor_turmas tables
-- Execute no SQL Editor do Supabase

-- 1. Verificar RLS em turmas_professores
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('turmas_professores', 'professor_turmas');

-- 2. Listar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('turmas_professores', 'professor_turmas')
ORDER BY tablename, cmd;

-- 3. Criar políticas para turmas_professores
DO $$
BEGIN
  -- Allow INSERT
  DROP POLICY IF EXISTS "Professores podem criar turmas" ON turmas_professores;
  CREATE POLICY "Professores podem criar turmas"
  ON turmas_professores
  FOR INSERT
  WITH CHECK (true);

  -- Allow SELECT
  DROP POLICY IF EXISTS "Professores podem ler turmas" ON turmas_professores;
  CREATE POLICY "Professores podem ler turmas"
  ON turmas_professores
  FOR SELECT
  USING (true);

  -- Allow UPDATE
  DROP POLICY IF EXISTS "Professores podem atualizar turmas" ON turmas_professores;
  CREATE POLICY "Professores podem atualizar turmas"
  ON turmas_professores
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
END $$;

-- 4. Criar políticas para professor_turmas (tabela de associação)
DO $$
BEGIN
  -- Allow INSERT
  DROP POLICY IF EXISTS "Professores podem associar turmas" ON professor_turmas;
  CREATE POLICY "Professores podem associar turmas"
  ON professor_turmas
  FOR INSERT
  WITH CHECK (true);

  -- Allow SELECT
  DROP POLICY IF EXISTS "Professores podem ler associações" ON professor_turmas;
  CREATE POLICY "Professores podem ler associações"
  ON professor_turmas
  FOR SELECT
  USING (true);

  -- Allow DELETE
  DROP POLICY IF EXISTS "Professores podem remover associações" ON professor_turmas;
  CREATE POLICY "Professores podem remover associações"
  ON professor_turmas
  FOR DELETE
  USING (true);
END $$;

-- 5. Verificar se políticas foram criadas
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('turmas_professores', 'professor_turmas')
ORDER BY tablename, cmd;
