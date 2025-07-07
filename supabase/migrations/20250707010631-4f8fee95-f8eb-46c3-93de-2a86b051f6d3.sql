
-- Adicionar campo para redação manuscrita na tabela redacoes_enviadas
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN redacao_manuscrita_url text;

-- Adicionar campo para redação manuscrita na tabela redacoes_simulado
ALTER TABLE public.redacoes_simulado 
ADD COLUMN redacao_manuscrita_url text;

-- Adicionar campo para redação manuscrita na tabela redacoes_exercicio
ALTER TABLE public.redacoes_exercicio 
ADD COLUMN redacao_manuscrita_url text;
