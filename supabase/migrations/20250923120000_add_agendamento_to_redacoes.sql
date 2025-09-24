-- Add scheduling functionality to redacoes table for exemplary essays
ALTER TABLE public.redacoes
ADD COLUMN IF NOT EXISTS data_agendamento TIMESTAMP WITH TIME ZONE;

-- Add index for better performance when querying scheduled essays
CREATE INDEX IF NOT EXISTS idx_redacoes_data_agendamento ON public.redacoes(data_agendamento);

-- Add comment for documentation
COMMENT ON COLUMN public.redacoes.data_agendamento IS 'Data e hora para publicação automática da redação exemplar. Se NULL, publica imediatamente.';