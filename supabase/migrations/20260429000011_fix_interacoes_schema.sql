-- Adiciona tipo_resposta à tabela interacoes (caso já exista sem esse campo)
ALTER TABLE interacoes
  ADD COLUMN IF NOT EXISTS tipo_resposta text NOT NULL DEFAULT 'alternativas';

-- Torna alternativa_id nullable (respostas abertas não têm alternativa)
ALTER TABLE interacoes_respostas
  ALTER COLUMN alternativa_id DROP NOT NULL;

-- Adiciona resposta_texto para armazenar respostas abertas
ALTER TABLE interacoes_respostas
  ADD COLUMN IF NOT EXISTS resposta_texto text;

-- Remove políticas antigas que usam auth.uid() e recria permissivas
-- (nenhum usuário do sistema usa Supabase Auth)
DO $$
DECLARE
  pol text;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename IN ('interacoes', 'interacoes_alternativas', 'interacoes_respostas')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I',
      pol,
      (SELECT tablename FROM pg_policies WHERE policyname = pol LIMIT 1));
  END LOOP;
END
$$;

CREATE POLICY "acesso_total_interacoes" ON interacoes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "acesso_total_alternativas" ON interacoes_alternativas
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "acesso_total_respostas" ON interacoes_respostas
  FOR ALL USING (true) WITH CHECK (true);
