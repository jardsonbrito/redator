
-- Adicionar campo de turmas na tabela aulas
ALTER TABLE public.aulas 
ADD COLUMN turmas TEXT[] DEFAULT '{}';

-- Adicionar campo de turmas na tabela exercicios  
ALTER TABLE public.exercicios
ADD COLUMN turmas TEXT[] DEFAULT '{}';

-- Comentários para documentar os campos
COMMENT ON COLUMN public.aulas.turmas IS 'Array de turmas que têm acesso a esta aula (ex: ["LRA2025", "LRB2025"])';
COMMENT ON COLUMN public.exercicios.turmas IS 'Array de turmas que têm acesso a este exercício (ex: ["LRA2025", "LRB2025"])';
