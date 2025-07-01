
-- Criar tabela para armazenar materiais da biblioteca
CREATE TABLE public.biblioteca_materiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  competencia TEXT NOT NULL CHECK (competencia IN ('C1', 'C2', 'C3', 'C4', 'C5')),
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  turmas_autorizadas TEXT[] DEFAULT '{}',
  permite_visitante BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'publicado' CHECK (status IN ('publicado', 'rascunho')),
  data_publicacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela
ALTER TABLE public.biblioteca_materiais ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público aos materiais publicados
CREATE POLICY "Public can view published materials" 
ON public.biblioteca_materiais 
FOR SELECT 
USING (status = 'publicado');

-- Políticas para admins
CREATE POLICY "Main admin can manage all materials" 
ON public.biblioteca_materiais 
FOR ALL 
TO authenticated
USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- Criar índices para melhorar performance
CREATE INDEX idx_biblioteca_materiais_competencia ON public.biblioteca_materiais(competencia);
CREATE INDEX idx_biblioteca_materiais_status ON public.biblioteca_materiais(status);
CREATE INDEX idx_biblioteca_materiais_data ON public.biblioteca_materiais(data_publicacao DESC);

-- Criar bucket de storage para os PDFs se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('biblioteca-pdfs', 'biblioteca-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage mais simples e funcionais
CREATE POLICY "Public can view biblioteca PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'biblioteca-pdfs');

CREATE POLICY "Authenticated users can upload biblioteca PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'biblioteca-pdfs');

CREATE POLICY "Authenticated users can update biblioteca PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'biblioteca-pdfs');

CREATE POLICY "Authenticated users can delete biblioteca PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'biblioteca-pdfs');
