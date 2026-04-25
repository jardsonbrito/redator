-- Adicionar Jarvis Correção como funcionalidade disponível
-- Execute no SQL Editor do Supabase

-- Verificar se já existe
SELECT * FROM funcionalidades WHERE chave = 'jarvis_correcao';

-- Inserir se não existir
INSERT INTO funcionalidades (
  chave,
  nome_exibicao,
  descricao,
  categoria,
  ordem_aluno,
  ativo,
  requer_plano,
  icone
)
VALUES (
  'jarvis_correcao',
  'Jarvis - Correção IA',
  'Correção de redações com inteligência artificial',
  'ferramentas',
  100,
  true,
  false,
  'Bot'
)
ON CONFLICT (chave) DO UPDATE SET
  nome_exibicao = EXCLUDED.nome_exibicao,
  descricao = EXCLUDED.descricao,
  ativo = true;

-- Verificar resultado
SELECT * FROM funcionalidades WHERE chave = 'jarvis_correcao';
