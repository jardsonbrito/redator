
-- Criar tabela de simulados
CREATE TABLE public.simulados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  frase_tematica TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  data_fim DATE NOT NULL,
  hora_fim TIME NOT NULL,
  turmas_autorizadas TEXT[] DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de redações de simulado
CREATE TABLE public.redacoes_simulado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_simulado UUID NOT NULL REFERENCES public.simulados(id) ON DELETE CASCADE,
  nome_aluno TEXT NOT NULL,
  email_aluno TEXT NOT NULL,
  texto TEXT NOT NULL,
  turma TEXT NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  corrigida BOOLEAN DEFAULT false,
  nota_c1 INTEGER,
  nota_c2 INTEGER,
  nota_c3 INTEGER,
  nota_c4 INTEGER,
  nota_c5 INTEGER,
  nota_total INTEGER,
  comentario_pedagogico TEXT,
  data_correcao TIMESTAMP WITH TIME ZONE
);

-- Habilitar Row Level Security
ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redacoes_simulado ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para simulados (todos podem ver simulados ativos)
CREATE POLICY "Simulados ativos são visíveis para todos" 
  ON public.simulados 
  FOR SELECT 
  USING (ativo = true);

-- Criar políticas RLS para redacoes_simulado (alunos só veem suas próprias redações)
CREATE POLICY "Alunos podem ver suas próprias redações de simulado" 
  ON public.redacoes_simulado 
  FOR SELECT 
  USING (email_aluno = auth.email());

CREATE POLICY "Alunos podem inserir redações de simulado" 
  ON public.redacoes_simulado 
  FOR INSERT 
  WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE public.simulados IS 'Tabela para armazenar simulados de redação com controle de horário e turmas';
COMMENT ON TABLE public.redacoes_simulado IS 'Tabela para armazenar redações enviadas em simulados';
COMMENT ON COLUMN public.simulados.turmas_autorizadas IS 'Array de turmas autorizadas (ex: ["LRA2025", "visitante"])';
