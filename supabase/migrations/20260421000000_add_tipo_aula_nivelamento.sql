-- Adiciona campo tipo_aula às tabelas de aulas para suportar a regra de nivelamento.
-- Aulas de nivelamento são convite — não computam frequência, nota nem boletim.

ALTER TABLE public.aulas_diario
  ADD COLUMN IF NOT EXISTS tipo_aula TEXT DEFAULT NULL;

ALTER TABLE public.aulas_virtuais
  ADD COLUMN IF NOT EXISTS tipo_aula TEXT DEFAULT NULL;

-- Índice para filtro eficiente nas queries de frequência
CREATE INDEX IF NOT EXISTS idx_aulas_diario_tipo_aula    ON public.aulas_diario (tipo_aula);
CREATE INDEX IF NOT EXISTS idx_aulas_virtuais_tipo_aula  ON public.aulas_virtuais (tipo_aula);

COMMENT ON COLUMN public.aulas_diario.tipo_aula IS
  'Tipo especial da aula. Valor ''nivelamento'' indica que alunos são apenas convidados '
  '— a ausência não penaliza frequência nem boletim. NULL = aula regular.';

COMMENT ON COLUMN public.aulas_virtuais.tipo_aula IS
  'Tipo especial da aula. Valor ''nivelamento'' indica que alunos são apenas convidados '
  '— a ausência não penaliza frequência nem boletim. NULL = aula regular.';
