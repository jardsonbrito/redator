-- Adicionar campo de motivo de devolução em redacoes_exercicio
-- Usado pela Produção Guiada quando o corretor/admin devolve a atividade ao aluno

ALTER TABLE public.redacoes_exercicio
  ADD COLUMN IF NOT EXISTS motivo_devolucao TEXT;

COMMENT ON COLUMN public.redacoes_exercicio.motivo_devolucao IS
  'Motivo da devolução da atividade ao aluno. Preenchido pelo corretor/admin quando status_corretor_1 = ''devolvida''.';
