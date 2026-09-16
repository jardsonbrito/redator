-- Distinguir turmas criadas pelo admin (para gestão de professores)
-- das turmas criadas pelo próprio professor (para agrupar redações no Jarvis)
ALTER TABLE turmas_professores
ADD COLUMN IF NOT EXISTS criado_pelo_professor_id UUID REFERENCES professores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_turmas_professores_criado_por
  ON turmas_professores(criado_pelo_professor_id);

COMMENT ON COLUMN turmas_professores.criado_pelo_professor_id IS
  'NULL = turma criada pelo admin (gestão de professores). Preenchido = turma criada pelo próprio professor via Jarvis.';
