-- Primeiro, vamos remover a política duplicada que foi criada
DROP POLICY IF EXISTS "Professores podem corrigir respostas através de admin" ON public.lousa_resposta;

-- Verificar as políticas atuais
SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'lousa_resposta';

-- A política existente "Professores podem corrigir respostas" já deveria permitir updates
-- Vamos verificar se há algum problema na lógica da política existente
-- Vamos recriar a política com uma lógica mais direta

DROP POLICY IF EXISTS "Professores podem corrigir respostas" ON public.lousa_resposta;

CREATE POLICY "Professores podem corrigir respostas" 
ON public.lousa_resposta 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.lousa l
    INNER JOIN public.professores p ON (p.email = auth.email())
    WHERE l.id = lousa_resposta.lousa_id 
    AND p.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.lousa l
    INNER JOIN public.professores p ON (p.email = auth.email())
    WHERE l.id = lousa_resposta.lousa_id 
    AND p.ativo = true
  )
);