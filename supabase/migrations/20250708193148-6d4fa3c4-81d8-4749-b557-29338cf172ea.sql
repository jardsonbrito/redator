
-- Criar tabela para armazenar marcações visuais nas redações
CREATE TABLE public.marcacoes_visuais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  redacao_id UUID NOT NULL,
  tabela_origem TEXT NOT NULL, -- 'redacoes_enviadas', 'redacoes_simulado', 'redacoes_exercicio'
  corretor_id UUID NOT NULL,
  
  -- Coordenadas da marcação (relativas à imagem)
  x_start DECIMAL(10,6) NOT NULL,
  y_start DECIMAL(10,6) NOT NULL,
  x_end DECIMAL(10,6) NOT NULL,
  y_end DECIMAL(10,6) NOT NULL,
  
  -- Dimensões originais da imagem para garantir proporções
  imagem_largura INTEGER NOT NULL,
  imagem_altura INTEGER NOT NULL,
  
  -- Dados da marcação
  competencia INTEGER NOT NULL CHECK (competencia BETWEEN 1 AND 5),
  cor_marcacao TEXT NOT NULL,
  comentario TEXT NOT NULL,
  
  -- Metadados
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_marcacoes_corretor 
    FOREIGN KEY (corretor_id) 
    REFERENCES public.corretores(id) 
    ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_marcacoes_redacao_id ON public.marcacoes_visuais(redacao_id);
CREATE INDEX idx_marcacoes_corretor_id ON public.marcacoes_visuais(corretor_id);
CREATE INDEX idx_marcacoes_competencia ON public.marcacoes_visuais(competencia);

-- RLS policies
ALTER TABLE public.marcacoes_visuais ENABLE ROW LEVEL SECURITY;

-- Admin pode gerenciar tudo
CREATE POLICY "Admin can manage marcacoes_visuais" 
ON public.marcacoes_visuais 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- Corretores podem ver e editar suas próprias marcações
CREATE POLICY "Corretores can manage their own marcacoes" 
ON public.marcacoes_visuais 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.corretores c 
    WHERE c.id = corretor_id AND c.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.corretores c 
    WHERE c.id = corretor_id AND c.ativo = true
  )
);

-- Público pode visualizar marcações (para alunos verem suas correções)
CREATE POLICY "Public can view marcacoes for corrections" 
ON public.marcacoes_visuais 
FOR SELECT 
USING (true);

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_marcacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marcacoes_updated_at
  BEFORE UPDATE ON public.marcacoes_visuais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marcacoes_updated_at();
