-- Adicionar campo ativo para controle de status dos alunos
ALTER TABLE public.profiles 
ADD COLUMN ativo boolean DEFAULT true;

-- Comentário: Alunos cadastrados manualmente ou via CSV serão ativos por padrão
-- Alunos cadastrados via link serão marcados como inativos no código da aplicação