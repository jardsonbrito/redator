
-- Recriar tabela para aulas
CREATE TABLE public.aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modulo TEXT NOT NULL CHECK (modulo IN ('Competência 1', 'Competência 2', 'Competência 3', 'Competência 4', 'Competência 5', 'Aula ao vivo')),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  link_conteudo TEXT NOT NULL,
  pdf_url TEXT,
  pdf_nome TEXT,
  turmas_autorizadas TEXT[] DEFAULT '{}',
  permite_visitante BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recriar tabela para exercícios
CREATE TABLE public.exercicios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Google Forms', 'Redação com Frase Temática')),
  link_forms TEXT, -- Para exercícios tipo Google Forms
  tema_id UUID REFERENCES public.temas(id), -- Para exercícios tipo Redação
  turmas_autorizadas TEXT[] DEFAULT '{}',
  permite_visitante BOOLEAN DEFAULT false,
  imagem_capa_url TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recriar tabela para redações de exercícios
CREATE TABLE public.redacoes_exercicio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercicio_id UUID REFERENCES public.exercicios(id) NOT NULL,
  nome_aluno TEXT NOT NULL,
  email_aluno TEXT NOT NULL,
  turma TEXT,
  redacao_texto TEXT NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  corrigida BOOLEAN DEFAULT false,
  nota_c1 INTEGER,
  nota_c2 INTEGER,
  nota_c3 INTEGER,
  nota_c4 INTEGER,
  nota_c5 INTEGER,
  nota_total INTEGER,
  comentario_admin TEXT,
  data_correcao TIMESTAMP WITH TIME ZONE
);

-- Criar índices para melhor performance
CREATE INDEX idx_aulas_modulo ON public.aulas(modulo);
CREATE INDEX idx_aulas_ativo ON public.aulas(ativo);
CREATE INDEX idx_exercicios_tipo ON public.exercicios(tipo);
CREATE INDEX idx_exercicios_ativo ON public.exercicios(ativo);
CREATE INDEX idx_redacoes_exercicio_email ON public.redacoes_exercicio(email_aluno);
CREATE INDEX idx_redacoes_exercicio_exercicio_id ON public.redacoes_exercicio(exercicio_id);
