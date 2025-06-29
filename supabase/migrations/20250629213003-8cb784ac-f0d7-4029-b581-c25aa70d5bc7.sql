
-- Create table for aula modules (Competência 1-5 and Aula ao vivo)
CREATE TABLE public.aula_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('competencia', 'ao_vivo')),
  competencia_numero INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for aulas (videos and live classes)
CREATE TABLE public.aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.aula_modules(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  youtube_url TEXT,
  google_meet_url TEXT,
  thumbnail_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert the 6 pre-defined modules
INSERT INTO public.aula_modules (nome, descricao, ordem, tipo, competencia_numero) VALUES
('Competência 1', 'Demonstrar domínio da modalidade escrita formal da língua portuguesa', 1, 'competencia', 1),
('Competência 2', 'Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento', 2, 'competencia', 2),
('Competência 3', 'Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos', 3, 'competencia', 3),
('Competência 4', 'Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação', 4, 'competencia', 4),
('Competência 5', 'Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos', 5, 'competencia', 5),
('Aula ao vivo', 'Participe das aulas ao vivo com o professor', 6, 'ao_vivo', NULL);

-- Add RLS policies for public access (similar to other content tables)
ALTER TABLE public.aula_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;

-- Allow public read access to modules and aulas
CREATE POLICY "Anyone can view aula modules" ON public.aula_modules FOR SELECT USING (true);
CREATE POLICY "Anyone can view aulas" ON public.aulas FOR SELECT USING (true);

-- Admin policies for managing content
CREATE POLICY "Admins can manage aula modules" ON public.aula_modules FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage aulas" ON public.aulas FOR ALL USING (public.is_admin());
