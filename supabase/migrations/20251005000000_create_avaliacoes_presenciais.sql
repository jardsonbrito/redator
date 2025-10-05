-- Migration: Criar tabela para Avaliações Presenciais
-- Data: 2025-10-05
-- Descrição: Nova tabela para registrar notas de avaliações presenciais dos alunos

-- Criar tabela de avaliações presenciais
CREATE TABLE IF NOT EXISTS public.avaliacoes_presenciais (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  turma text NOT NULL,
  etapa_id uuid NOT NULL REFERENCES public.etapas_estudo(id) ON DELETE CASCADE,
  aluno_email text NOT NULL,
  nota numeric(4,2) NOT NULL CHECK (nota >= 0 AND nota <= 10),
  observacoes text,
  professor_email text,
  data_avaliacao date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraint para garantir uma avaliação por aluno por etapa
  CONSTRAINT unique_aluno_etapa UNIQUE (aluno_email, etapa_id)
);

-- Índices para otimizar consultas
CREATE INDEX idx_avaliacoes_presenciais_turma ON public.avaliacoes_presenciais(turma);
CREATE INDEX idx_avaliacoes_presenciais_etapa ON public.avaliacoes_presenciais(etapa_id);
CREATE INDEX idx_avaliacoes_presenciais_aluno ON public.avaliacoes_presenciais(aluno_email);

-- RLS Policies
ALTER TABLE public.avaliacoes_presenciais ENABLE ROW LEVEL SECURITY;

-- Policy para admins (leitura e escrita total)
CREATE POLICY "Admins podem gerenciar todas as avaliações presenciais"
  ON public.avaliacoes_presenciais
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND ativo = true
    )
  );

-- Policy para professores (leitura e escrita de todas as avaliações)
-- Nota: Como a tabela professores não tem campo turmas_autorizadas,
-- professores ativos podem gerenciar todas as avaliações
CREATE POLICY "Professores podem gerenciar avaliações presenciais"
  ON public.avaliacoes_presenciais
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professores p
      WHERE p.email = auth.jwt() ->> 'email'
      AND p.ativo = true
    )
  );

-- Policy para alunos (apenas leitura das próprias notas)
CREATE POLICY "Alunos podem ver apenas suas próprias avaliações"
  ON public.avaliacoes_presenciais
  FOR SELECT
  TO authenticated
  USING (
    aluno_email = (auth.jwt() ->> 'email')
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_avaliacoes_presenciais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_avaliacoes_presenciais_updated_at
  BEFORE UPDATE ON public.avaliacoes_presenciais
  FOR EACH ROW
  EXECUTE FUNCTION update_avaliacoes_presenciais_updated_at();

-- Comentários na tabela
COMMENT ON TABLE public.avaliacoes_presenciais IS 'Armazena notas de avaliações presenciais dos alunos por etapa';
COMMENT ON COLUMN public.avaliacoes_presenciais.nota IS 'Nota da avaliação presencial (escala 0-10)';
COMMENT ON COLUMN public.avaliacoes_presenciais.etapa_id IS 'Referência à etapa de estudo';
COMMENT ON COLUMN public.avaliacoes_presenciais.data_avaliacao IS 'Data em que a avaliação foi realizada';
