-- Primeiro, criar a tabela para controlar visualizações das redações devolvidas
CREATE TABLE IF NOT EXISTS public.redacao_devolucao_visualizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  redacao_id UUID NOT NULL,
  tabela_origem TEXT NOT NULL CHECK (tabela_origem IN ('redacoes_enviadas', 'redacoes_simulado', 'redacoes_exercicio')),
  email_aluno TEXT NOT NULL,
  visualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar RLS
ALTER TABLE public.redacao_devolucao_visualizacoes ENABLE ROW LEVEL SECURITY;

-- Política para admin
CREATE POLICY "Admin can manage devolucao_visualizacoes"
ON public.redacao_devolucao_visualizacoes FOR ALL
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- Política para inserção por qualquer um (necessário para registrar visualização)
CREATE POLICY "Anyone can insert devolucao_visualizacoes"
ON public.redacao_devolucao_visualizacoes FOR INSERT
WITH CHECK (true);

-- Política para visualização por qualquer um
CREATE POLICY "Anyone can view devolucao_visualizacoes"
ON public.redacao_devolucao_visualizacoes FOR SELECT
USING (true);

-- Adicionar campos para rastreamento de justificativa de devolução
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN IF NOT EXISTS justificativa_devolucao TEXT,
ADD COLUMN IF NOT EXISTS devolvida_por UUID REFERENCES public.corretores(id),
ADD COLUMN IF NOT EXISTS data_devolucao TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.redacoes_simulado 
ADD COLUMN IF NOT EXISTS justificativa_devolucao TEXT,
ADD COLUMN IF NOT EXISTS devolvida_por UUID REFERENCES public.corretores(id),
ADD COLUMN IF NOT EXISTS data_devolucao TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.redacoes_exercicio 
ADD COLUMN IF NOT EXISTS justificativa_devolucao TEXT,
ADD COLUMN IF NOT EXISTS devolvida_por UUID REFERENCES public.corretores(id),
ADD COLUMN IF NOT EXISTS data_devolucao TIMESTAMP WITH TIME ZONE;

-- Função para marcar visualização de redação devolvida
CREATE OR REPLACE FUNCTION public.marcar_redacao_devolvida_como_visualizada(
  redacao_id_param UUID,
  tabela_origem_param TEXT,
  email_aluno_param TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Inserir registro de visualização
  INSERT INTO public.redacao_devolucao_visualizacoes (
    redacao_id,
    tabela_origem,
    email_aluno
  ) VALUES (
    redacao_id_param,
    tabela_origem_param,
    email_aluno_param
  )
  ON CONFLICT DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Função para verificar se redação devolvida foi visualizada
CREATE OR REPLACE FUNCTION public.verificar_redacao_devolvida_visualizada(
  redacao_id_param UUID,
  tabela_origem_param TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.redacao_devolucao_visualizacoes 
    WHERE redacao_id = redacao_id_param 
    AND tabela_origem = tabela_origem_param
  );
END;
$$;