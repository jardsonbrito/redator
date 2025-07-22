-- Etapa 1: Estrutura híbrida de categorias na Biblioteca

-- Criar tabela de categorias
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir categorias iniciais das competências
INSERT INTO public.categorias (nome, slug, ordem) VALUES
  ('Competência 1', 'competencia-1', 1),
  ('Competência 2', 'competencia-2', 2),
  ('Competência 3', 'competencia-3', 3),
  ('Competência 4', 'competencia-4', 4),
  ('Competência 5', 'competencia-5', 5);

-- Adicionar campo categoria_id na tabela biblioteca_materiais
ALTER TABLE public.biblioteca_materiais 
ADD COLUMN categoria_id UUID REFERENCES public.categorias(id);

-- Migrar dados existentes baseados no campo competencia
UPDATE public.biblioteca_materiais 
SET categoria_id = (
  SELECT id FROM public.categorias 
  WHERE slug = CASE 
    WHEN biblioteca_materiais.competencia = 'C1' THEN 'competencia-1'
    WHEN biblioteca_materiais.competencia = 'C2' THEN 'competencia-2'
    WHEN biblioteca_materiais.competencia = 'C3' THEN 'competencia-3'
    WHEN biblioteca_materiais.competencia = 'C4' THEN 'competencia-4'
    WHEN biblioteca_materiais.competencia = 'C5' THEN 'competencia-5'
    ELSE 'competencia-1' -- fallback
  END
);

-- Tornar categoria_id obrigatório após migração
ALTER TABLE public.biblioteca_materiais 
ALTER COLUMN categoria_id SET NOT NULL;

-- Habilitar RLS na tabela categorias
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- Política para visualização pública de categorias ativas
CREATE POLICY "Public can view active categories" 
ON public.categorias 
FOR SELECT 
USING (ativa = true);

-- Política para admins gerenciarem categorias
CREATE POLICY "Admin can manage categories" 
ON public.categorias 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

-- Trigger para atualizar timestamp
CREATE TRIGGER update_categorias_updated_at
BEFORE UPDATE ON public.categorias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();