-- Corrigir especificamente o registro problemático
UPDATE profiles 
SET turma = 'Turma A'
WHERE email = 'abiliode@laboratoriodoredator.com';

-- Limpar todos os registros com caracteres estranhos
UPDATE profiles 
SET turma = CASE 
  WHEN turma LIKE '%Turma A%' THEN 'Turma A'
  WHEN turma LIKE '%Turma B%' THEN 'Turma B'
  WHEN turma LIKE '%Turma C%' THEN 'Turma C'
  WHEN turma LIKE '%Turma D%' THEN 'Turma D'
  WHEN turma LIKE '%Turma E%' THEN 'Turma E'
  ELSE turma
END
WHERE user_type = 'aluno';