
-- Adicionar coluna user_type na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'aluno';

-- Definir o administrador
UPDATE public.profiles 
SET user_type = 'admin' 
WHERE email = 'jardsonbrito@gmail.com';

-- Habilitar RLS nas tabelas se não estiver habilitado
ALTER TABLE public.temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se existirem
DROP POLICY IF EXISTS "Admins podem deletar temas" ON public.temas;
DROP POLICY IF EXISTS "Admins podem deletar redações" ON public.redacoes;
DROP POLICY IF EXISTS "Admins podem deletar vídeos" ON public.videos;

-- Criar políticas de exclusão para administradores
CREATE POLICY "Admins podem deletar temas" 
ON public.temas FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND user_type = 'admin'
));

CREATE POLICY "Admins podem deletar redações" 
ON public.redacoes FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND user_type = 'admin'
));

CREATE POLICY "Admins podem deletar vídeos" 
ON public.videos FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND user_type = 'admin'
));
