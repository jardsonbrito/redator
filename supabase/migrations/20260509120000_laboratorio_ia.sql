-- Novos campos na tabela do Laboratório para suporte a geração por IA
ALTER TABLE public.repertorio_laboratorio
  ADD COLUMN IF NOT EXISTS gerado_por_ia  BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tema_origem_id UUID        REFERENCES public.temas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ia_gerado_em   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_laboratorio_tema_origem
  ON public.repertorio_laboratorio(tema_origem_id)
  WHERE tema_origem_id IS NOT NULL;

COMMENT ON COLUMN public.repertorio_laboratorio.gerado_por_ia  IS 'true quando a aula foi criada automaticamente por IA';
COMMENT ON COLUMN public.repertorio_laboratorio.tema_origem_id IS 'Tema que originou esta aula (usado para evitar duplicidade)';
COMMENT ON COLUMN public.repertorio_laboratorio.ia_gerado_em   IS 'Timestamp da chamada à IA que gerou esta aula';

-- Tabela de configuração de IA para o Laboratório de Repertório
-- Mantém apenas uma linha (upsert pelo id fixo)
CREATE TABLE IF NOT EXISTS public.laboratorio_ia_config (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    TEXT        NOT NULL DEFAULT 'anthropic'
              CHECK (provider IN ('anthropic', 'openai', 'gemini')),
  model       TEXT        NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  temperatura NUMERIC(3,2) NOT NULL DEFAULT 0.70
              CHECK (temperatura BETWEEN 0.00 AND 1.00),
  max_tokens  INTEGER     NOT NULL DEFAULT 2000,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.laboratorio_ia_config IS 'Config única de IA para geração automática de aulas do Laboratório de Repertório';

CREATE OR REPLACE FUNCTION public.update_laboratorio_ia_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_laboratorio_ia_config_updated_at
  BEFORE UPDATE ON public.laboratorio_ia_config
  FOR EACH ROW EXECUTE FUNCTION public.update_laboratorio_ia_config_updated_at();

ALTER TABLE public.laboratorio_ia_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_config_select_authenticated"
  ON public.laboratorio_ia_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "lab_config_all_authenticated"
  ON public.laboratorio_ia_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Configuração padrão
INSERT INTO public.laboratorio_ia_config (provider, model, temperatura, max_tokens)
VALUES ('anthropic', 'claude-3-5-sonnet-20241022', 0.70, 2000)
ON CONFLICT DO NOTHING;
