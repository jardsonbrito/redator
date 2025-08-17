
-- 1) Adicionar colunas canônicas para entrada e saída
ALTER TABLE public.presenca_aulas
  ADD COLUMN IF NOT EXISTS entrada_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS saida_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aluno_id UUID;

-- 2) Criar índice único para garantir uma linha por (aula_id, aluno_id)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_presenca_aula_aluno
  ON public.presenca_aulas (aula_id, aluno_id);

-- 3) Constraint para garantir consistência temporal
ALTER TABLE public.presenca_aulas
  ADD CONSTRAINT IF NOT EXISTS presenca_tempo_ok
  CHECK (saida_at IS NULL OR entrada_at IS NULL OR saida_at >= entrada_at);

-- 4) Chave estrangeira para aulas_virtuais
ALTER TABLE public.presenca_aulas
  ADD CONSTRAINT IF NOT EXISTS presenca_aula_fk
  FOREIGN KEY (aula_id) REFERENCES public.aulas_virtuais (id) ON DELETE CASCADE;

-- 5) Backfill dos dados existentes - migrar registros de entrada
UPDATE public.presenca_aulas
SET 
  entrada_at = COALESCE(entrada_at, data_registro),
  aluno_id = COALESCE(aluno_id, (
    SELECT p.id 
    FROM public.profiles p 
    WHERE p.email = presenca_aulas.email_aluno 
    LIMIT 1
  ))
WHERE entrada_at IS NULL AND tipo_registro = 'entrada';

-- 6) Migrar registros de saída para a mesma linha do aluno
UPDATE public.presenca_aulas p1
SET saida_at = p2.data_registro
FROM public.presenca_aulas p2
WHERE p1.aula_id = p2.aula_id 
  AND p1.email_aluno = p2.email_aluno
  AND p1.tipo_registro = 'entrada'
  AND p2.tipo_registro = 'saida'
  AND p1.saida_at IS NULL;

-- 7) Remover registros duplicados de saída (manter apenas os de entrada com saída preenchida)
DELETE FROM public.presenca_aulas 
WHERE tipo_registro = 'saida';
