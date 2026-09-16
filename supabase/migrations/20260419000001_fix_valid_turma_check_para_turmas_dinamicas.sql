-- Expande a constraint valid_turma_check para permitir turmas dinâmicas
-- (alunos vinculados via turma_id podem ter qualquer nome no campo turma)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_turma_check;

ALTER TABLE public.profiles ADD CONSTRAINT valid_turma_check CHECK (
  (turma IS NULL)
  OR (turma = '')
  OR (turma = ANY (ARRAY['A','B','C','D','E','F','G','H','VISITANTE','AGUARDANDO','REPROVADOS']))
  OR (turma LIKE 'PS-%')
  OR (turma_id IS NOT NULL)
);
