-- Adiciona campo sexo à tabela corretores para tratamento correto de gênero
-- (Corretora/Corretor) na interface sem depender apenas de heurística pelo nome.
ALTER TABLE public.corretores
  ADD COLUMN IF NOT EXISTS sexo text
  CONSTRAINT corretores_sexo_check CHECK (sexo IN ('masculino', 'feminino'))
  DEFAULT NULL;
