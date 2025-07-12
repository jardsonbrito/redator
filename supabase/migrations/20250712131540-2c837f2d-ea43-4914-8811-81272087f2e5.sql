-- Corrigir política RLS para marcacoes_visuais permitir inserção por corretores
DROP POLICY IF EXISTS "Corretores can manage their own marcacoes" ON public.marcacoes_visuais;

-- Criar política que permite aos corretores inserir suas próprias marcações
CREATE POLICY "Corretores can insert their own marcacoes"
ON public.marcacoes_visuais
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.id = marcacoes_visuais.corretor_id 
    AND c.ativo = true
  )
);

-- Criar política que permite aos corretores atualizar suas próprias marcações  
CREATE POLICY "Corretores can update their own marcacoes"
ON public.marcacoes_visuais
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.id = marcacoes_visuais.corretor_id 
    AND c.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.id = marcacoes_visuais.corretor_id 
    AND c.ativo = true
  )
);

-- Criar política que permite aos corretores deletar suas próprias marcações
CREATE POLICY "Corretores can delete their own marcacoes"
ON public.marcacoes_visuais
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.corretores c
    WHERE c.id = marcacoes_visuais.corretor_id 
    AND c.ativo = true
  )
);