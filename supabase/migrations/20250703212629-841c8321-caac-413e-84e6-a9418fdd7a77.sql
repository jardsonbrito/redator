-- Limpar caracteres invisíveis e espaços da coluna turma na tabela profiles
UPDATE profiles 
SET turma = TRIM(REGEXP_REPLACE(turma, '[[:space:][:cntrl:]]', ' ', 'g'))
WHERE user_type = 'aluno';

-- Verificar se há outros problemas similares
UPDATE profiles 
SET 
  nome = TRIM(nome),
  email = TRIM(LOWER(email))
WHERE user_type = 'aluno';