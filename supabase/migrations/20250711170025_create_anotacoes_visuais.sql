
-- Create table for visual annotations on essay images
CREATE TABLE public.anotacoes_visuais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  redacao_id UUID NOT NULL,
  corretor_id UUID NOT NULL,
  competencia INTEGER NOT NULL CHECK (competencia >= 1 AND competencia <= 5),
  cor_marcacao TEXT NOT NULL,
  comentario TEXT NOT NULL,
  coordenadas JSONB NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_anotacoes_visuais_redacao_id ON public.anotacoes_visuais(redacao_id);
CREATE INDEX idx_anotacoes_visuais_corretor_id ON public.anotacoes_visuais(corretor_id);

-- Add RLS policies
ALTER TABLE public.anotacoes_visuais ENABLE ROW LEVEL SECURITY;

-- Policy for corretores to view annotations
CREATE POLICY "Corretores can view annotations" 
  ON public.anotacoes_visuais 
  FOR SELECT 
  USING (true); -- Corretores podem ver todas as anotações

-- Policy for corretores to create their own annotations
CREATE POLICY "Corretores can create annotations" 
  ON public.anotacoes_visuais 
  FOR INSERT 
  WITH CHECK (true); -- Corretores podem criar anotações

-- Policy for corretores to update their own annotations
CREATE POLICY "Corretores can update their own annotations" 
  ON public.anotacoes_visuais 
  FOR UPDATE 
  USING (true);

-- Policy for corretores to delete their own annotations
CREATE POLICY "Corretores can delete their own annotations" 
  ON public.anotacoes_visuais 
  FOR DELETE 
  USING (true);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_anotacoes_visuais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_anotacoes_visuais_updated_at
  BEFORE UPDATE ON public.anotacoes_visuais
  FOR EACH ROW
  EXECUTE FUNCTION update_anotacoes_visuais_updated_at();
