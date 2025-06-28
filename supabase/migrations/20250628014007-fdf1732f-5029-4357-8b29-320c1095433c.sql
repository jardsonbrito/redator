
-- Add the missing columns to the redacoes table for storing exemplary essay metadata
ALTER TABLE public.redacoes 
ADD COLUMN frase_tematica TEXT,
ADD COLUMN eixo_tematico TEXT;
