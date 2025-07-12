
-- Adicionar a coluna permite_visitante na tabela avisos
ALTER TABLE public.avisos 
ADD COLUMN permite_visitante boolean DEFAULT false;

-- Comentário da coluna para documentação
COMMENT ON COLUMN public.avisos.permite_visitante IS 'Se true, permite que visitantes vejam este aviso';
