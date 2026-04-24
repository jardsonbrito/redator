-- Marca qual corretor serve de atalho de acesso rápido no painel admin.
-- O card no dashboard admin só aparece para corretores com acesso_admin = true.

ALTER TABLE public.corretores
  ADD COLUMN IF NOT EXISTS acesso_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE public.corretores
  SET acesso_admin = true
  WHERE email = 'jarvis@gmail.com';
