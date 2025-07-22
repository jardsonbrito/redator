-- Remover o campo competencia da tabela biblioteca_materiais
-- pois agora usamos categoria_id como referência

ALTER TABLE public.biblioteca_materiais 
DROP COLUMN IF EXISTS competencia;