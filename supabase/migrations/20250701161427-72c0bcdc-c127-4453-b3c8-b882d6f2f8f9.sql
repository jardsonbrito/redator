-- Criar tabela de avisos
CREATE TABLE public.avisos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  turmas_autorizadas TEXT[] DEFAULT '{}',
  data_agendamento TIMESTAMP WITH TIME ZONE NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'agendado')),
  imagem_url TEXT NULL,
  link_externo TEXT NULL,
  prioridade TEXT NOT NULL DEFAULT 'comum' CHECK (prioridade IN ('comum', 'destaque')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de confirmações de leitura
CREATE TABLE public.avisos_leitura (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aviso_id UUID NOT NULL REFERENCES public.avisos(id) ON DELETE CASCADE,
  nome_aluno TEXT NOT NULL,
  sobrenome_aluno TEXT NOT NULL,
  turma TEXT NOT NULL,
  email_aluno TEXT NULL,
  data_leitura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(aviso_id, nome_aluno, sobrenome_aluno, turma)
);

-- Habilitar RLS
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_leitura ENABLE ROW LEVEL SECURITY;

-- Políticas para avisos
CREATE POLICY "Admin pode gerenciar avisos" 
ON public.avisos 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

CREATE POLICY "Público pode ver avisos publicados" 
ON public.avisos 
FOR SELECT 
USING (status = 'publicado' AND ativo = true);

-- Políticas para leituras
CREATE POLICY "Admin pode ver todas as leituras" 
ON public.avisos_leitura 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

CREATE POLICY "Qualquer um pode inserir confirmação de leitura" 
ON public.avisos_leitura 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Público pode ver confirmações de leitura" 
ON public.avisos_leitura 
FOR SELECT 
USING (true);

-- Trigger para atualizar data de modificação
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_avisos_updated_at
BEFORE UPDATE ON public.avisos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_avisos_status ON public.avisos(status);
CREATE INDEX idx_avisos_turmas ON public.avisos USING GIN(turmas_autorizadas);
CREATE INDEX idx_avisos_leitura_aviso ON public.avisos_leitura(aviso_id);