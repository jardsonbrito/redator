-- Deletar e recriar com valores corretos
UPDATE profiles SET turma = 'Turma A' WHERE turma LIKE '%A%' AND user_type = 'aluno';
UPDATE profiles SET turma = 'Turma B' WHERE turma LIKE '%B%' AND user_type = 'aluno';
UPDATE profiles SET turma = 'Turma C' WHERE turma LIKE '%C%' AND user_type = 'aluno';
UPDATE profiles SET turma = 'Turma D' WHERE turma LIKE '%D%' AND user_type = 'aluno';
UPDATE profiles SET turma = 'Turma E' WHERE turma LIKE '%E%' AND user_type = 'aluno';