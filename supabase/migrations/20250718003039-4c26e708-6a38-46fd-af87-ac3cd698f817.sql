-- Criar enum para autor das mensagens
CREATE TYPE public.autor_mensagem AS ENUM ('aluno', 'corretor');

-- Criar tabela de mensagens da ajuda rápida
CREATE TABLE public.ajuda_rapida_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL,
  corretor_id UUID NOT NULL,
  mensagem TEXT NOT NULL,
  autor autor_mensagem NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lida BOOLEAN NOT NULL DEFAULT false,
  
  -- Índices para melhorar performance
  UNIQUE(id)
);

-- Adicionar índices para consultas frequentes
CREATE INDEX idx_ajuda_rapida_aluno_corretor ON public.ajuda_rapida_mensagens(aluno_id, corretor_id);
CREATE INDEX idx_ajuda_rapida_criado_em ON public.ajuda_rapida_mensagens(criado_em DESC);
CREATE INDEX idx_ajuda_rapida_nao_lida ON public.ajuda_rapida_mensagens(lida) WHERE lida = false;

-- Habilitar RLS
ALTER TABLE public.ajuda_rapida_mensagens ENABLE ROW LEVEL SECURITY;

-- Política para alunos: podem ver e inserir apenas suas próprias mensagens
CREATE POLICY "Alunos podem ver suas mensagens" 
ON public.ajuda_rapida_mensagens 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_type = 'aluno' 
    AND id = ajuda_rapida_mensagens.aluno_id
  )
);

CREATE POLICY "Alunos podem inserir suas mensagens" 
ON public.ajuda_rapida_mensagens 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_type = 'aluno' 
    AND id = aluno_id
  )
);

-- Política para corretores: podem ver e inserir mensagens onde são participantes
CREATE POLICY "Corretores podem ver suas conversas" 
ON public.ajuda_rapida_mensagens 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.corretores 
    WHERE id = ajuda_rapida_mensagens.corretor_id 
    AND email = auth.email()
    AND ativo = true
  )
);

CREATE POLICY "Corretores podem inserir mensagens" 
ON public.ajuda_rapida_mensagens 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.corretores 
    WHERE id = corretor_id 
    AND email = auth.email()
    AND ativo = true
  )
);

-- Política para admin: acesso total
CREATE POLICY "Admin acesso total" 
ON public.ajuda_rapida_mensagens 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- Função para limpeza automática (conversas antigas > 30 dias)
CREATE OR REPLACE FUNCTION public.limpar_mensagens_antigas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.ajuda_rapida_mensagens 
  WHERE criado_em < NOW() - INTERVAL '30 days';
END;
$$;

-- Função para contar mensagens não lidas por corretor
CREATE OR REPLACE FUNCTION public.contar_mensagens_nao_lidas_corretor(corretor_email text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT concat(m.aluno_id, '-', m.corretor_id))::integer
  FROM public.ajuda_rapida_mensagens m
  JOIN public.corretores c ON m.corretor_id = c.id
  WHERE c.email = corretor_email 
    AND c.ativo = true
    AND m.autor = 'aluno'
    AND m.lida = false;
$$;

-- Função para marcar conversa como lida
CREATE OR REPLACE FUNCTION public.marcar_conversa_como_lida(p_aluno_id uuid, p_corretor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ajuda_rapida_mensagens 
  SET lida = true 
  WHERE aluno_id = p_aluno_id 
    AND corretor_id = p_corretor_id 
    AND autor = 'aluno'
    AND lida = false;
END;
$$;