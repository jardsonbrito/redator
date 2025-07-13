-- Adicionar coluna numero_sequencial para numeração global das marcações
ALTER TABLE public.marcacoes_visuais 
ADD COLUMN numero_sequencial INTEGER;

-- Criar índice para melhor performance na ordenação
CREATE INDEX idx_marcacoes_visuais_numero_sequencial 
ON public.marcacoes_visuais(redacao_id, numero_sequencial);

-- Atualizar marcações existentes com numeração sequencial
WITH numbered_marcacoes AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY redacao_id, tabela_origem 
           ORDER BY criado_em ASC
         ) as numero
  FROM public.marcacoes_visuais
  WHERE numero_sequencial IS NULL
)
UPDATE public.marcacoes_visuais 
SET numero_sequencial = numbered_marcacoes.numero
FROM numbered_marcacoes
WHERE public.marcacoes_visuais.id = numbered_marcacoes.id;