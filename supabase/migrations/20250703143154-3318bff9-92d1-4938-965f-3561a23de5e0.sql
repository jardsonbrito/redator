-- Adicionar campo permite_visitante na tabela aulas_virtuais
ALTER TABLE public.aulas_virtuais 
ADD COLUMN IF NOT EXISTS permite_visitante boolean NOT NULL DEFAULT false;