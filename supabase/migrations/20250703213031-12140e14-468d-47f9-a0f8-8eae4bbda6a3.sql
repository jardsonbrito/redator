-- CORREÇÃO GLOBAL: Normalizar todas as turmas no banco de dados
-- Limpar caracteres invisíveis e padronizar formato

-- Primeiro, ver o que temos
UPDATE profiles 
SET turma = CASE 
  WHEN TRIM(REPLACE(REPLACE(turma, CHR(0), ''), CHR(9), '')) LIKE 'Turma A%' THEN 'Turma A'
  WHEN TRIM(REPLACE(REPLACE(turma, CHR(0), ''), CHR(9), '')) LIKE 'Turma B%' THEN 'Turma B'  
  WHEN TRIM(REPLACE(REPLACE(turma, CHR(0), ''), CHR(9), '')) LIKE 'Turma C%' THEN 'Turma C'
  WHEN TRIM(REPLACE(REPLACE(turma, CHR(0), ''), CHR(9), '')) LIKE 'Turma D%' THEN 'Turma D'
  WHEN TRIM(REPLACE(REPLACE(turma, CHR(0), ''), CHR(9), '')) LIKE 'Turma E%' THEN 'Turma E'
  ELSE TRIM(REPLACE(REPLACE(turma, CHR(0), ''), CHR(9), ''))
END
WHERE user_type = 'aluno';

-- Normalizar também email (remover espaços e converter para lowercase)
UPDATE profiles 
SET email = TRIM(LOWER(email))
WHERE user_type = 'aluno';

-- Normalizar nomes (remover espaços extras)
UPDATE profiles 
SET nome = TRIM(REGEXP_REPLACE(nome, '\s+', ' ', 'g'))
WHERE user_type = 'aluno';