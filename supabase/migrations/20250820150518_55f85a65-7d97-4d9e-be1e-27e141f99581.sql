-- Add render metadata columns to essay tables
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN IF NOT EXISTS render_width INTEGER,
ADD COLUMN IF NOT EXISTS render_height INTEGER;

ALTER TABLE public.redacoes_simulado 
ADD COLUMN IF NOT EXISTS render_width INTEGER,
ADD COLUMN IF NOT EXISTS render_height INTEGER;

ALTER TABLE public.redacoes_exercicio 
ADD COLUMN IF NOT EXISTS render_width INTEGER,
ADD COLUMN IF NOT EXISTS render_height INTEGER;