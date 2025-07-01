
-- Remover tabelas relacionadas a exercícios
DROP TABLE IF EXISTS public.exercicios CASCADE;

-- Remover tabelas relacionadas a aulas
DROP TABLE IF EXISTS public.aulas CASCADE;
DROP TABLE IF EXISTS public.aula_modules CASCADE;

-- Remover referência de exercício na tabela redacoes_enviadas
ALTER TABLE public.redacoes_enviadas DROP COLUMN IF EXISTS id_exercicio;
