
-- Adicionar campo ordem_criacao à tabela marcacoes_visuais
ALTER TABLE public.marcacoes_visuais 
ADD COLUMN ordem_criacao INTEGER DEFAULT 1;

-- Atualizar registros existentes com ordem baseada na data de criação
UPDATE public.marcacoes_visuais 
SET ordem_criacao = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY redacao_id ORDER BY criado_em) as row_num
  FROM public.marcacoes_visuais
) AS subquery
WHERE public.marcacoes_visuais.id = subquery.id;

-- Criar índice para melhor performance nas consultas ordenadas
CREATE INDEX idx_marcacoes_visuais_ordem ON public.marcacoes_visuais(redacao_id, ordem_criacao);
