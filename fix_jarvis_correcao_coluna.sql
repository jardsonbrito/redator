-- Adicionar coluna jarvis_correcao_creditos na tabela professores
-- Execute isso no SQL Editor do Supabase se der erro 406

ALTER TABLE professores
ADD COLUMN IF NOT EXISTS jarvis_correcao_creditos INTEGER NOT NULL DEFAULT 0;

-- Adicionar constraint de valor positivo
ALTER TABLE professores
DROP CONSTRAINT IF EXISTS professores_jarvis_correcao_creditos_check;

ALTER TABLE professores
ADD CONSTRAINT professores_jarvis_correcao_creditos_check
CHECK (jarvis_correcao_creditos >= 0);

-- Criar índice para performance
DROP INDEX IF EXISTS idx_professores_jarvis_correcao_creditos;

CREATE INDEX idx_professores_jarvis_correcao_creditos
ON professores(jarvis_correcao_creditos);

-- Adicionar comentário
COMMENT ON COLUMN professores.jarvis_correcao_creditos IS
'Créditos disponíveis para correção de redações com IA (sistema Jarvis Correção)';

-- Adicionar 100 créditos iniciais para professores ativos
UPDATE professores
SET jarvis_correcao_creditos = 100
WHERE ativo = true
  AND jarvis_correcao_creditos = 0;

SELECT
  email,
  nome_completo,
  jarvis_correcao_creditos,
  ativo
FROM professores
ORDER BY email;
