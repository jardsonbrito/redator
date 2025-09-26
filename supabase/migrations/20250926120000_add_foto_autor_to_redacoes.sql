-- Add foto_autor field to redacoes table for exemplary essays
ALTER TABLE public.redacoes
ADD COLUMN IF NOT EXISTS foto_autor TEXT;

-- Add comment to explain the field purpose
COMMENT ON COLUMN public.redacoes.foto_autor IS 'URL da foto do autor da redação exemplar';