
-- Verificar a constraint atual da tabela avisos para o campo prioridade
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'avisos_prioridade_check';

-- Se a constraint não permitir os valores que estamos enviando, vamos atualizá-la
ALTER TABLE public.avisos 
DROP CONSTRAINT IF EXISTS avisos_prioridade_check;

-- Criar nova constraint que aceite os valores corretos
ALTER TABLE public.avisos 
ADD CONSTRAINT avisos_prioridade_check 
CHECK (prioridade IN ('alta', 'media', 'baixa'));
