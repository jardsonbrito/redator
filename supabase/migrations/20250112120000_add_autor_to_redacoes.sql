-- Add author field to redacoes table for exemplary essays
ALTER TABLE public.redacoes 
ADD COLUMN IF NOT EXISTS autor TEXT;

-- Add index for better performance when searching by author
CREATE INDEX IF NOT EXISTS idx_redacoes_autor ON public.redacoes(autor);