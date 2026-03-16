-- Implementação do tipo "Produção Guiada" de exercício

-- 1. Coluna enunciado na tabela exercicios (texto livre da atividade)
ALTER TABLE public.exercicios
  ADD COLUMN IF NOT EXISTS enunciado TEXT;

-- 2. Tabela de critérios de avaliação personalizados por exercício
CREATE TABLE IF NOT EXISTS public.producao_guiada_criterios (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exercicio_id UUID        NOT NULL REFERENCES public.exercicios(id) ON DELETE CASCADE,
  nome         TEXT        NOT NULL,
  ordem        INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.producao_guiada_criterios ENABLE ROW LEVEL SECURITY;

-- Leitura pública (alunos e corretores precisam ver os critérios)
CREATE POLICY "producao_guiada_criterios_read"
  ON public.producao_guiada_criterios
  FOR SELECT
  USING (true);

-- Escrita apenas por admins autenticados
CREATE POLICY "producao_guiada_criterios_admin_write"
  ON public.producao_guiada_criterios
  FOR ALL
  USING (
    auth.email() IN (
      SELECT email FROM public.admin_users WHERE ativo = true
    )
  );

-- 3. Tabela de notas por critério (preenchida pelo corretor)
CREATE TABLE IF NOT EXISTS public.producao_guiada_notas_criterios (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id UUID    NOT NULL REFERENCES public.redacoes_exercicio(id) ON DELETE CASCADE,
  criterio_id UUID    NOT NULL REFERENCES public.producao_guiada_criterios(id) ON DELETE CASCADE,
  nota        INTEGER NOT NULL CHECK (nota IN (0, 40, 80, 120, 160, 200)),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (resposta_id, criterio_id)
);

ALTER TABLE public.producao_guiada_notas_criterios ENABLE ROW LEVEL SECURITY;

-- Corretores e admins podem ler e escrever
CREATE POLICY "producao_guiada_notas_all"
  ON public.producao_guiada_notas_criterios
  FOR ALL
  USING (true);
