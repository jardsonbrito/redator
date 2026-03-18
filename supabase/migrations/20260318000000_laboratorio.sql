-- Tabela principal do Laboratório de Repertório
CREATE TABLE IF NOT EXISTS public.repertorio_laboratorio (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           TEXT NOT NULL,
  subtitulo        TEXT NOT NULL,
  frase_tematica   TEXT NOT NULL,
  eixos            TEXT[] NOT NULL DEFAULT '{}',
  nome_autor       TEXT NOT NULL,
  descricao_autor  TEXT NOT NULL,
  obra_referencia  TEXT NOT NULL,
  ideia_central    TEXT NOT NULL,
  paragrafo_modelo TEXT NOT NULL,
  imagem_autor_url TEXT,
  ativo            BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.repertorio_laboratorio IS 'Aulas do Laboratório de Repertório — fluxo guiado de 3 telas para ensinar aplicação de repertório';
COMMENT ON COLUMN public.repertorio_laboratorio.subtitulo IS 'Linha de contexto exibida nos cards da listagem (~150 chars)';
COMMENT ON COLUMN public.repertorio_laboratorio.eixos IS 'Array de eixos temáticos usando valores de EIXOS_TEMATICOS';
COMMENT ON COLUMN public.repertorio_laboratorio.imagem_autor_url IS 'URL pública no bucket laboratorio-autores (WebP)';

-- Tabela de progresso do aluno (criada agora, usada no futuro)
CREATE TABLE IF NOT EXISTS public.repertorio_laboratorio_progresso (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  laboratorio_id   UUID NOT NULL REFERENCES public.repertorio_laboratorio(id) ON DELETE CASCADE,
  step_concluido   INTEGER NOT NULL DEFAULT 1 CHECK (step_concluido BETWEEN 1 AND 3),
  concluido        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, laboratorio_id)
);

COMMENT ON TABLE public.repertorio_laboratorio_progresso IS 'Progresso do aluno nas aulas do Laboratório (não usado na v1, pronto para v2)';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_laboratorio_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_laboratorio_updated_at
  BEFORE UPDATE ON public.repertorio_laboratorio
  FOR EACH ROW EXECUTE FUNCTION public.update_laboratorio_updated_at();

CREATE TRIGGER trg_laboratorio_progresso_updated_at
  BEFORE UPDATE ON public.repertorio_laboratorio_progresso
  FOR EACH ROW EXECUTE FUNCTION public.update_laboratorio_updated_at();

-- RLS
ALTER TABLE public.repertorio_laboratorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repertorio_laboratorio_progresso ENABLE ROW LEVEL SECURITY;

-- Leitura: todos os autenticados (filtro de ativo feito na camada de app)
CREATE POLICY "laboratorio_select_authenticated"
  ON public.repertorio_laboratorio
  FOR SELECT
  TO authenticated
  USING (true);

-- Escrita: todos os autenticados (controle de acesso feito na camada de app)
CREATE POLICY "laboratorio_insert_authenticated"
  ON public.repertorio_laboratorio
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "laboratorio_update_authenticated"
  ON public.repertorio_laboratorio
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "laboratorio_delete_authenticated"
  ON public.repertorio_laboratorio
  FOR DELETE
  TO authenticated
  USING (true);

-- Progresso: aluno vê e gerencia o próprio
CREATE POLICY "progresso_select_own"
  ON public.repertorio_laboratorio_progresso
  FOR SELECT
  TO authenticated
  USING (aluno_id = auth.uid());

CREATE POLICY "progresso_insert_own"
  ON public.repertorio_laboratorio_progresso
  FOR INSERT
  TO authenticated
  WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "progresso_update_own"
  ON public.repertorio_laboratorio_progresso
  FOR UPDATE
  TO authenticated
  USING (aluno_id = auth.uid());

-- Storage bucket para imagens dos autores
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'laboratorio-autores', 'laboratorio-autores', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
