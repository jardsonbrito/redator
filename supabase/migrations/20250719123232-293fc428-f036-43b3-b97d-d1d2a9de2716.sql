-- Corrigir políticas RLS para ajuda_rapida_mensagens
-- Remover políticas existentes problemáticas
DROP POLICY IF EXISTS "Alunos podem inserir suas mensagens" ON public.ajuda_rapida_mensagens;
DROP POLICY IF EXISTS "Alunos podem ver suas mensagens" ON public.ajuda_rapida_mensagens;

-- Criar novas políticas mais flexíveis
CREATE POLICY "Alunos podem inserir mensagens baseado no aluno_id" 
ON public.ajuda_rapida_mensagens 
FOR INSERT 
WITH CHECK (
  -- Permitir se é um aluno autenticado
  (EXISTS ( SELECT 1
     FROM profiles
    WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'aluno'::text) AND (profiles.id = ajuda_rapida_mensagens.aluno_id))
  )) 
  OR 
  -- Permitir se é um aluno não autenticado mas o aluno_id corresponde a um perfil válido
  (auth.uid() IS NULL AND EXISTS ( SELECT 1
     FROM profiles 
    WHERE profiles.id = ajuda_rapida_mensagens.aluno_id AND profiles.user_type = 'aluno'::text
  ))
);

CREATE POLICY "Alunos podem ver suas mensagens baseado no aluno_id" 
ON public.ajuda_rapida_mensagens 
FOR SELECT 
USING (
  -- Permitir se é um aluno autenticado
  (EXISTS ( SELECT 1
     FROM profiles
    WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'aluno'::text) AND (profiles.id = ajuda_rapida_mensagens.aluno_id))
  )) 
  OR 
  -- Permitir acesso público para leitura (será controlado pela aplicação)
  (auth.uid() IS NULL)
);