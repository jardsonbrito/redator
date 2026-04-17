-- Tabela para múltiplos modelos dentro de cada redação exemplar
CREATE TABLE public.redacao_exemplar_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redacao_id UUID NOT NULL REFERENCES public.redacoes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT 'Modelo 1',
  conteudo TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.redacao_exemplar_modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de modelos exemplares"
ON public.redacao_exemplar_modelos FOR SELECT
USING (true);

CREATE POLICY "Admins gerenciam modelos exemplares"
ON public.redacao_exemplar_modelos FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
