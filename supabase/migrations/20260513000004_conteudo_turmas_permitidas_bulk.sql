-- Atualizar aulas e simulados para 'Redatores 2026'
UPDATE public.aulas
  SET turmas_autorizadas = ARRAY['Redatores 2026']
  WHERE NOT (turmas_autorizadas @> ARRAY['Redatores 2026']);

UPDATE public.simulados
  SET turmas_autorizadas = ARRAY['Redatores 2026']
  WHERE NOT (turmas_autorizadas @> ARRAY['Redatores 2026']);

-- Adicionar turmas_permitidas às tabelas que ainda não têm
ALTER TABLE public.biblioteca_materiais
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.exercicios
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.redacoes_comentadas
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.redacao_exemplar_modelos
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.repertorio_laboratorio
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.guias_tematicos
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.interacoes
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

-- Marcar todos os registros existentes para Redatores 2026
UPDATE public.biblioteca_materiais  SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.exercicios            SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.redacoes_comentadas   SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.redacao_exemplar_modelos SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.repertorio_laboratorio SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.guias_tematicos       SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.interacoes            SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
