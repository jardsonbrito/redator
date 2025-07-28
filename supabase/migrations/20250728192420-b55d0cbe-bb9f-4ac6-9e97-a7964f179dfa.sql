-- Criar políticas RLS para permitir que corretores atualizem o campo audio_url

-- Política para redacoes_enviadas
CREATE POLICY "Corretores podem atualizar audio_url em redacoes_enviadas" 
ON public.redacoes_enviadas 
FOR UPDATE 
USING (
  -- Permitir se o usuário é um corretor ativo assignado à redação
  EXISTS (
    SELECT 1 FROM public.corretores c 
    WHERE c.ativo = true 
    AND (c.id = redacoes_enviadas.corretor_id_1 OR c.id = redacoes_enviadas.corretor_id_2)
  )
)
WITH CHECK (
  -- Mesma condição para check
  EXISTS (
    SELECT 1 FROM public.corretores c 
    WHERE c.ativo = true 
    AND (c.id = redacoes_enviadas.corretor_id_1 OR c.id = redacoes_enviadas.corretor_id_2)
  )
);

-- Política para redacoes_simulado
CREATE POLICY "Corretores podem atualizar audio_url em redacoes_simulado" 
ON public.redacoes_simulado 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.corretores c 
    WHERE c.ativo = true 
    AND (c.id = redacoes_simulado.corretor_id_1 OR c.id = redacoes_simulado.corretor_id_2)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.corretores c 
    WHERE c.ativo = true 
    AND (c.id = redacoes_simulado.corretor_id_1 OR c.id = redacoes_simulado.corretor_id_2)
  )
);

-- Política para redacoes_exercicio
CREATE POLICY "Corretores podem atualizar audio_url em redacoes_exercicio" 
ON public.redacoes_exercicio 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.corretores c 
    WHERE c.ativo = true 
    AND (c.id = redacoes_exercicio.corretor_id_1 OR c.id = redacoes_exercicio.corretor_id_2)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.corretores c 
    WHERE c.ativo = true 
    AND (c.id = redacoes_exercicio.corretor_id_1 OR c.id = redacoes_exercicio.corretor_id_2)
  )
);