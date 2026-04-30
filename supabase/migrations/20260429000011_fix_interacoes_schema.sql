-- Adiciona tipo_resposta à tabela interacoes (caso já exista sem esse campo)
ALTER TABLE interacoes
  ADD COLUMN IF NOT EXISTS tipo_resposta text NOT NULL DEFAULT 'alternativas';

-- Torna alternativa_id nullable (respostas abertas não têm alternativa)
ALTER TABLE interacoes_respostas
  ALTER COLUMN alternativa_id DROP NOT NULL;

-- Remove a FK NOT NULL constraint antiga se existir e reaplica como nullable
-- (DROP NOT NULL acima já é suficiente para PostgreSQL)

-- Adiciona resposta_texto para armazenar respostas abertas
ALTER TABLE interacoes_respostas
  ADD COLUMN IF NOT EXISTS resposta_texto text;

-- Políticas admin (caso a migration anterior não tenha criado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'interacoes' AND policyname = 'admin_gerencia_interacoes'
  ) THEN
    EXECUTE 'CREATE POLICY "admin_gerencia_interacoes" ON interacoes
      FOR ALL USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'interacoes_alternativas' AND policyname = 'admin_gerencia_alternativas'
  ) THEN
    EXECUTE 'CREATE POLICY "admin_gerencia_alternativas" ON interacoes_alternativas
      FOR ALL USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'interacoes_respostas' AND policyname = 'admin_gerencia_respostas'
  ) THEN
    EXECUTE 'CREATE POLICY "admin_gerencia_respostas" ON interacoes_respostas
      FOR ALL USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END
$$;
