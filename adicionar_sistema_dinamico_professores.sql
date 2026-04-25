-- Tornar dashboard de professores dinâmico igual ao de alunos
-- Execute no SQL Editor do Supabase

-- 1. Adicionar coluna ordem_professor na tabela funcionalidades
ALTER TABLE funcionalidades
ADD COLUMN IF NOT EXISTS ordem_professor INTEGER;

-- 2. Adicionar coluna habilitado_professor (controle de visibilidade)
ALTER TABLE funcionalidades
ADD COLUMN IF NOT EXISTS habilitado_professor BOOLEAN DEFAULT true;

-- 3. Atualizar funcionalidades existentes com ordem_professor
UPDATE funcionalidades SET ordem_professor = 1, habilitado_professor = true WHERE chave = 'temas';
UPDATE funcionalidades SET ordem_professor = 2, habilitado_professor = true WHERE chave = 'guia_tematico';
UPDATE funcionalidades SET ordem_professor = 3, habilitado_professor = true WHERE chave = 'repertorio_orientado';
UPDATE funcionalidades SET ordem_professor = 4, habilitado_professor = true WHERE chave = 'redacoes_exemplares';
UPDATE funcionalidades SET ordem_professor = 5, habilitado_professor = false WHERE chave = 'redacoes_comentadas';
UPDATE funcionalidades SET ordem_professor = 6, habilitado_professor = true WHERE chave = 'aulas_gravadas';
UPDATE funcionalidades SET ordem_professor = 7, habilitado_professor = true WHERE chave = 'aulas_ao_vivo';
UPDATE funcionalidades SET ordem_professor = 8, habilitado_professor = true WHERE chave = 'biblioteca';
UPDATE funcionalidades SET ordem_professor = 9, habilitado_professor = false WHERE chave = 'microaprendizagem';

-- 4. Inserir ou atualizar Jarvis Correção
INSERT INTO funcionalidades (
  chave,
  nome_exibicao,
  descricao,
  categoria,
  ordem_aluno,
  ordem_professor,
  ativo,
  habilitado_professor,
  requer_plano,
  icone
)
VALUES (
  'jarvis_correcao',
  'Jarvis - Correção IA',
  'Correção de redações com inteligência artificial para professores',
  'ferramentas',
  999,
  10,
  true,
  true,
  false,
  'Bot'
)
ON CONFLICT (chave) DO UPDATE SET
  nome_exibicao = EXCLUDED.nome_exibicao,
  descricao = EXCLUDED.descricao,
  ordem_professor = EXCLUDED.ordem_professor,
  habilitado_professor = EXCLUDED.habilitado_professor,
  ativo = true;

-- 5. Criar função para buscar funcionalidades de professores
CREATE OR REPLACE FUNCTION get_professor_features()
RETURNS TABLE (
  chave TEXT,
  nome_exibicao TEXT,
  descricao TEXT,
  icone TEXT,
  ordem_professor INTEGER,
  habilitado_professor BOOLEAN,
  categoria TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.chave,
    f.nome_exibicao,
    f.descricao,
    f.icone,
    f.ordem_professor,
    f.habilitado_professor,
    f.categoria
  FROM funcionalidades f
  WHERE f.ativo = true
    AND f.ordem_professor IS NOT NULL
    AND f.habilitado_professor = true
  ORDER BY f.ordem_professor ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Adicionar comentários
COMMENT ON COLUMN funcionalidades.ordem_professor IS 'Ordem de exibição no dashboard de professores';
COMMENT ON COLUMN funcionalidades.habilitado_professor IS 'Se true, a funcionalidade aparece para professores';

-- 7. Verificar resultado
SELECT
  chave,
  nome_exibicao,
  ordem_professor,
  habilitado_professor,
  icone
FROM funcionalidades
WHERE ordem_professor IS NOT NULL
ORDER BY ordem_professor;
