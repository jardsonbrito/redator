-- Completar tabelas que já têm o campo mas com registros faltando
UPDATE public.aulas_virtuais
  SET turmas_autorizadas = ARRAY['Redatores 2026']
  WHERE turmas_autorizadas IS NULL OR turmas_autorizadas = '{}'
     OR NOT (turmas_autorizadas @> ARRAY['Redatores 2026']);

UPDATE public.calendario_atividades
  SET turmas_autorizadas = ARRAY['Redatores 2026']
  WHERE turmas_autorizadas IS NULL OR turmas_autorizadas = '{}'
     OR NOT (turmas_autorizadas @> ARRAY['Redatores 2026']);

UPDATE public.games
  SET turmas_autorizadas = ARRAY['Redatores 2026']
  WHERE turmas_autorizadas IS NULL OR turmas_autorizadas = '{}'
     OR NOT (turmas_autorizadas @> ARRAY['Redatores 2026']);

-- Adicionar turmas_permitidas às tabelas que não têm
ALTER TABLE public.micro_topicos
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.repertorio_frases
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.repertorio_obras
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.repertorio_publicacoes
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.jarvis_modos
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

ALTER TABLE public.jarvis_tutoria_subtabs
  ADD COLUMN IF NOT EXISTS turmas_permitidas TEXT[];

-- Marcar tudo para Redatores 2026
UPDATE public.micro_topicos        SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.repertorio_frases    SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.repertorio_obras     SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.repertorio_publicacoes SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.jarvis_modos         SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
UPDATE public.jarvis_tutoria_subtabs SET turmas_permitidas = ARRAY['Redatores 2026'] WHERE turmas_permitidas IS NULL OR turmas_permitidas = '{}';
