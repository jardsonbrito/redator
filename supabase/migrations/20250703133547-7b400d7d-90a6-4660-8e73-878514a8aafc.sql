-- Criar tabela para aulas virtuais
CREATE TABLE public.aulas_virtuais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_aula DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  turmas_autorizadas TEXT[] NOT NULL DEFAULT '{}',
  imagem_capa_url TEXT,
  link_meet TEXT NOT NULL,
  abrir_aba_externa BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para registro de presença
CREATE TABLE public.presenca_aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aula_id UUID NOT NULL REFERENCES public.aulas_virtuais(id) ON DELETE CASCADE,
  nome_aluno TEXT NOT NULL,
  sobrenome_aluno TEXT NOT NULL,
  email_aluno TEXT NOT NULL,
  turma TEXT NOT NULL,
  tipo_registro TEXT NOT NULL CHECK (tipo_registro IN ('entrada', 'saida')),
  data_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint para evitar duplicatas por tipo de registro
  UNIQUE(aula_id, email_aluno, tipo_registro)
);

-- Habilitar RLS
ALTER TABLE public.aulas_virtuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presenca_aulas ENABLE ROW LEVEL SECURITY;

-- Políticas para aulas_virtuais
CREATE POLICY "Admin pode gerenciar aulas virtuais" 
ON public.aulas_virtuais 
FOR ALL 
USING (is_main_admin()) 
WITH CHECK (is_main_admin());

CREATE POLICY "Público pode ver aulas ativas" 
ON public.aulas_virtuais 
FOR SELECT 
USING (ativo = true);

-- Políticas para presenca_aulas
CREATE POLICY "Admin pode ver toda presença" 
ON public.presenca_aulas 
FOR ALL 
USING (is_main_admin()) 
WITH CHECK (is_main_admin());

CREATE POLICY "Qualquer um pode registrar presença" 
ON public.presenca_aulas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Alunos podem ver própria presença" 
ON public.presenca_aulas 
FOR SELECT 
USING (true);

-- Trigger para atualizar timestamp
CREATE TRIGGER update_aulas_virtuais_updated_at
BEFORE UPDATE ON public.aulas_virtuais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular tempo de presença
CREATE OR REPLACE FUNCTION public.calcular_tempo_presenca(p_aula_id UUID, p_email_aluno TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  entrada_timestamp TIMESTAMP WITH TIME ZONE;
  saida_timestamp TIMESTAMP WITH TIME ZONE;
  tempo_minutos INTEGER;
BEGIN
  -- Buscar horário de entrada
  SELECT data_registro INTO entrada_timestamp
  FROM public.presenca_aulas
  WHERE aula_id = p_aula_id 
    AND email_aluno = p_email_aluno 
    AND tipo_registro = 'entrada';
  
  -- Buscar horário de saída
  SELECT data_registro INTO saida_timestamp
  FROM public.presenca_aulas
  WHERE aula_id = p_aula_id 
    AND email_aluno = p_email_aluno 
    AND tipo_registro = 'saida';
  
  -- Calcular diferença em minutos se ambos existem
  IF entrada_timestamp IS NOT NULL AND saida_timestamp IS NOT NULL THEN
    tempo_minutos := EXTRACT(EPOCH FROM (saida_timestamp - entrada_timestamp)) / 60;
    RETURN tempo_minutos;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;