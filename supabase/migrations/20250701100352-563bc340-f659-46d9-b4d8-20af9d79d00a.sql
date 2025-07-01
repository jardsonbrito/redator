-- Criar tabela aulas
CREATE TABLE IF NOT EXISTS public.aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  modulo TEXT NOT NULL,
  link_conteudo TEXT NOT NULL,
  pdf_url TEXT,
  pdf_nome TEXT,
  turmas_autorizadas TEXT[] DEFAULT '{}',
  permite_visitante BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela exercicios  
CREATE TABLE IF NOT EXISTS public.exercicios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  link_forms TEXT,
  tema_id UUID REFERENCES public.temas(id),
  imagem_capa_url TEXT,
  turmas_autorizadas TEXT[] DEFAULT '{}',
  permite_visitante BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;

-- Políticas para aulas
CREATE POLICY "Anyone can view aulas" ON public.aulas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert aulas" ON public.aulas FOR INSERT WITH CHECK (true);
CREATE POLICY "Main admin can manage all aulas" ON public.aulas FOR ALL TO authenticated USING (public.is_main_admin()) WITH CHECK (public.is_main_admin());

-- Políticas para exercicios
CREATE POLICY "Anyone can view exercicios" ON public.exercicios FOR SELECT USING (true);
CREATE POLICY "Anyone can insert exercicios" ON public.exercicios FOR INSERT WITH CHECK (true);
CREATE POLICY "Main admin can manage all exercicios" ON public.exercicios FOR ALL TO authenticated USING (public.is_main_admin()) WITH CHECK (public.is_main_admin());