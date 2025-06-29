
-- Criar tabela para exercícios
CREATE TABLE public.exercicios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('formulario', 'frase_tematica')),
  url_formulario TEXT DEFAULT NULL,
  embed_formulario BOOLEAN DEFAULT false,
  frase_tematica TEXT DEFAULT NULL,
  imagem_thumbnail TEXT DEFAULT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para segurança
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer pessoa veja exercícios ativos
CREATE POLICY "Public can view active exercicios" ON public.exercicios 
  FOR SELECT USING (ativo = true);

-- Políticas para administradores gerenciarem exercícios
CREATE POLICY "Admins can view all exercicios" ON public.exercicios 
  FOR SELECT USING (public.is_main_admin());

CREATE POLICY "Admins can insert exercicios" ON public.exercicios 
  FOR INSERT WITH CHECK (public.is_main_admin());

CREATE POLICY "Admins can update exercicios" ON public.exercicios 
  FOR UPDATE USING (public.is_main_admin());

CREATE POLICY "Admins can delete exercicios" ON public.exercicios 
  FOR DELETE USING (public.is_main_admin());

-- Adicionar campo id_exercicio na tabela redacoes_enviadas para referência cruzada
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN id_exercicio UUID DEFAULT NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_exercicios_tipo ON public.exercicios(tipo);
CREATE INDEX IF NOT EXISTS idx_exercicios_ativo ON public.exercicios(ativo);
CREATE INDEX IF NOT EXISTS idx_redacoes_enviadas_exercicio ON public.redacoes_enviadas(id_exercicio);

-- Adicionar constraint de foreign key opcional (nullable)
ALTER TABLE public.redacoes_enviadas 
ADD CONSTRAINT fk_redacoes_enviadas_exercicio 
FOREIGN KEY (id_exercicio) REFERENCES public.exercicios(id) ON DELETE SET NULL;
