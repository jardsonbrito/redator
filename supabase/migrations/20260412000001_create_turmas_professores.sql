-- Cria tabela de turmas de professores com código de acesso para self-service
CREATE TABLE public.turmas_professores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  codigo_acesso TEXT NOT NULL UNIQUE,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vincula professor à sua turma (opcional: professor pode não ter turma ainda)
ALTER TABLE public.professores
  ADD COLUMN turma_id UUID REFERENCES public.turmas_professores(id) ON DELETE SET NULL;

-- Índice para lookup por código de acesso (usado no self-service por link)
CREATE INDEX idx_turmas_professores_codigo ON public.turmas_professores(codigo_acesso);

-- RLS: somente service_role manipula diretamente; admin acessa via RPC
ALTER TABLE public.turmas_professores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin lê turmas_professores"
  ON public.turmas_professores FOR SELECT
  USING (true);
