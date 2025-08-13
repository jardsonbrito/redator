-- Adicionar novos campos para padronização de exercícios
ALTER TABLE public.exercicios 
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS cover_upload_path TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Tornar agendamento obrigatório para todos os tipos
-- Atualizar exercícios sem agendamento com período padrão (próximo ano)
UPDATE public.exercicios 
SET 
  data_inicio = CURRENT_DATE,
  hora_inicio = '00:00:00',
  data_fim = CURRENT_DATE + INTERVAL '1 year',
  hora_fim = '23:59:59'
WHERE data_inicio IS NULL OR hora_inicio IS NULL OR data_fim IS NULL OR hora_fim IS NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_exercicios_periodo ON public.exercicios(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_exercicios_ativo ON public.exercicios(ativo);

-- Adicionar trigger para updated_at
CREATE OR REPLACE FUNCTION update_exercicios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_exercicios_updated_at_trigger ON public.exercicios;
CREATE TRIGGER update_exercicios_updated_at_trigger
  BEFORE UPDATE ON public.exercicios
  FOR EACH ROW
  EXECUTE FUNCTION update_exercicios_updated_at();