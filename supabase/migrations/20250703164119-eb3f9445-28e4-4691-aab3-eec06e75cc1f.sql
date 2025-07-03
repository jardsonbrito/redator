-- Inserir um aluno de teste para verificar o funcionamento
INSERT INTO public.profiles (id, nome, sobrenome, email, turma, user_type, is_authenticated_student)
VALUES (
  gen_random_uuid(),
  'João Silva',
  '',
  'joao@teste.com',
  'Turma A',
  'aluno',
  true
);

-- Inserir mais um aluno para teste
INSERT INTO public.profiles (id, nome, sobrenome, email, turma, user_type, is_authenticated_student)
VALUES (
  gen_random_uuid(),
  'Maria Santos',
  '',
  'maria@teste.com',
  'Turma B',
  'aluno',
  true
);