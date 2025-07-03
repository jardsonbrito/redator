-- Criar tabela para dados do radar (resultados de exercícios importados)
CREATE TABLE public.radar_dados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_aluno TEXT NOT NULL,
  email_aluno TEXT NOT NULL,
  turma TEXT NOT NULL,
  titulo_exercicio TEXT NOT NULL,
  data_realizacao DATE NOT NULL,
  nota DECIMAL(5,2),
  exercicio_id UUID REFERENCES public.exercicios(id),
  importado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  importado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_radar_dados_aluno ON public.radar_dados(nome_aluno);
CREATE INDEX idx_radar_dados_turma ON public.radar_dados(turma);
CREATE INDEX idx_radar_dados_exercicio ON public.radar_dados(titulo_exercicio);
CREATE INDEX idx_radar_dados_data ON public.radar_dados(data_realizacao);
CREATE INDEX idx_radar_dados_nota ON public.radar_dados(nota);

-- Enable Row Level Security
ALTER TABLE public.radar_dados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Apenas admin pode ver dados do radar" 
ON public.radar_dados 
FOR SELECT 
USING (is_main_admin());

CREATE POLICY "Apenas admin pode inserir dados do radar" 
ON public.radar_dados 
FOR INSERT 
WITH CHECK (is_main_admin());

CREATE POLICY "Apenas admin pode atualizar dados do radar" 
ON public.radar_dados 
FOR UPDATE 
USING (is_main_admin());

CREATE POLICY "Apenas admin pode deletar dados do radar" 
ON public.radar_dados 
FOR DELETE 
USING (is_main_admin());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_radar_dados_updated_at
BEFORE UPDATE ON public.radar_dados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.radar_dados IS 'Dados importados de exercícios para análise no painel Radar';
COMMENT ON COLUMN public.radar_dados.nota IS 'Nota do aluno no exercício (pode ser decimal)';
COMMENT ON COLUMN public.radar_dados.exercicio_id IS 'Referência ao exercício original (opcional)';
COMMENT ON COLUMN public.radar_dados.importado_por IS 'ID do admin que fez a importação';