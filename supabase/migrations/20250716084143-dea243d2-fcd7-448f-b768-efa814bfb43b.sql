-- Criar profile para o administrador principal
INSERT INTO public.profiles (id, nome, sobrenome, email, user_type, ativo, status_aprovacao, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Administrador',
  'Principal',
  'jardsonbrito@gmail.com',
  'admin',
  true,
  'ativo',
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING;