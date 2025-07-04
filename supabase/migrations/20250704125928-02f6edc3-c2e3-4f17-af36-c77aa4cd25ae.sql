-- Criar política RLS para permitir leitura pública das redações exemplares (administradas)
CREATE POLICY "Public can view exemplary redacoes" 
ON public.redacoes 
FOR SELECT 
USING (true);

-- Remover as políticas restritivas existentes que estão bloqueando o acesso
DROP POLICY IF EXISTS "Alunos podem ver suas próprias redações" ON public.redacoes;
DROP POLICY IF EXISTS "Alunos podem criar suas próprias redações" ON public.redacoes;