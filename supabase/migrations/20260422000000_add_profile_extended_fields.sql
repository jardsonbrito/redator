-- Migration: Adicionar campos estendidos ao perfil do aluno
-- Descrição: Adiciona campos de WhatsApp, cidade, data de nascimento, escola e série à tabela profiles

-- Adicionar coluna WhatsApp
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Adicionar coluna Cidade
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cidade TEXT;

-- Adicionar coluna Data de Nascimento
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS data_nascimento DATE;

-- Adicionar coluna Escola de Origem
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS escola TEXT;

-- Adicionar coluna Série/Ano
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS serie TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.whatsapp IS 'WhatsApp do aluno para contato';
COMMENT ON COLUMN public.profiles.cidade IS 'Cidade de residência do aluno';
COMMENT ON COLUMN public.profiles.data_nascimento IS 'Data de nascimento do aluno';
COMMENT ON COLUMN public.profiles.escola IS 'Escola de origem do aluno';
COMMENT ON COLUMN public.profiles.serie IS 'Série ou ano escolar do aluno (ex: 3º ano)';
