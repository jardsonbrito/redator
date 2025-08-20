-- Corrigir políticas RLS para permitir que professores corrijam respostas
-- Primeiro, vamos ver as políticas atuais
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'lousa_resposta';

-- Vamos criar uma nova política para permitir que professores atualizem respostas
CREATE POLICY "Professores podem corrigir respostas através de admin" 
ON public.lousa_resposta 
FOR UPDATE 
USING (
  -- Permitir se for admin (já existe)
  is_main_admin() OR
  -- Permitir se for professor ativo
  (EXISTS (
    SELECT 1 FROM public.professores p 
    WHERE p.email = auth.email() AND p.ativo = true
  ))
)
WITH CHECK (
  -- Permitir se for admin (já existe)  
  is_main_admin() OR
  -- Permitir se for professor ativo
  (EXISTS (
    SELECT 1 FROM public.professores p 
    WHERE p.email = auth.email() AND p.ativo = true
  ))
);