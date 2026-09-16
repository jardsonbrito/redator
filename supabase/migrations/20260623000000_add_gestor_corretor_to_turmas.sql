-- Adiciona gestor_corretor_id à tabela turmas_alunos.
-- O campo gerenciada_por já existia no banco com valores 'admin' | 'externo'.
-- gestor_corretor_id aponta para qual corretor é o gestor/admin de uma turma externa.
-- Default NULL: turmas existentes continuam sem gestor até o admin configurar.

ALTER TABLE public.turmas_alunos
  ADD COLUMN IF NOT EXISTS gestor_corretor_id uuid
    REFERENCES public.corretores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_turmas_alunos_gestor
  ON public.turmas_alunos(gestor_corretor_id);
