-- Flexibiliza destinatário da interação para aceitar nomes de turmas
ALTER TABLE interacoes DROP CONSTRAINT IF EXISTS interacoes_destinatario_check;

-- Retrocompatibilidade: antigos valores alunos/professores → todos
UPDATE interacoes SET destinatario = 'todos'
WHERE destinatario IN ('alunos', 'professores');
