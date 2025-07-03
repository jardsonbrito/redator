-- CORREÇÃO GLOBAL SIMPLIFICADA: Recriar todos os registros de turma corretamente

-- Atualizar todos os registros de uma vez
UPDATE profiles 
SET turma = CASE 
  WHEN turma LIKE '%A%' THEN 'Turma A'
  WHEN turma LIKE '%B%' THEN 'Turma B'  
  WHEN turma LIKE '%C%' THEN 'Turma C'
  WHEN turma LIKE '%D%' THEN 'Turma D'
  WHEN turma LIKE '%E%' THEN 'Turma E'
  ELSE turma
END
WHERE user_type = 'aluno';

-- Garantir que emails estão em lowercase
UPDATE profiles 
SET email = LOWER(email)
WHERE user_type = 'aluno' AND email != LOWER(email);