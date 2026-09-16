-- Fix duplicação de eventos no calendário quando aula ao vivo filha é criada.
-- Causa: trigger usava ON CONFLICT DO NOTHING sem constraint, então disparava
-- dois INSERTs (INSERT inicial + UPDATE do aula_gravada_id = 2 entradas).

-- 1. Limpar duplicatas existentes (manter a mais antiga por entidade)
DELETE FROM public.calendario_atividades
WHERE id NOT IN (
  SELECT DISTINCT ON (entidade_tipo, entidade_id) id
  FROM public.calendario_atividades
  WHERE entidade_id IS NOT NULL
  ORDER BY entidade_tipo, entidade_id, criado_em ASC
)
AND entidade_id IS NOT NULL;

-- 2. Índice único parcial para bloquear duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS uniq_calendario_entidade
  ON public.calendario_atividades (entidade_tipo, entidade_id)
  WHERE entidade_id IS NOT NULL;

-- 3. Trigger com upsert real (ON CONFLICT ... DO UPDATE)
CREATE OR REPLACE FUNCTION public.sync_aula_virtual_to_calendario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendario_atividades
    WHERE entidade_tipo = 'aula_ao_vivo' AND entidade_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.calendario_atividades
    (titulo, tipo_evento, data_evento, hora_inicio, hora_fim,
     entidade_tipo, entidade_id, link_direto,
     turmas_autorizadas, permite_visitante, status, ativo)
  VALUES (
    NEW.titulo,
    'aula_ao_vivo',
    NEW.data_aula,
    NEW.horario_inicio,
    NEW.horario_fim,
    'aula_ao_vivo',
    NEW.id,
    NEW.link_meet,
    COALESCE(NEW.turmas_autorizadas, '{}'),
    COALESCE(NEW.permite_visitante, false),
    'publicado',
    true
  )
  ON CONFLICT (entidade_tipo, entidade_id) WHERE entidade_id IS NOT NULL
  DO UPDATE SET
    titulo             = EXCLUDED.titulo,
    data_evento        = EXCLUDED.data_evento,
    hora_inicio        = EXCLUDED.hora_inicio,
    hora_fim           = EXCLUDED.hora_fim,
    link_direto        = EXCLUDED.link_direto,
    turmas_autorizadas = EXCLUDED.turmas_autorizadas,
    permite_visitante  = EXCLUDED.permite_visitante;

  RETURN NEW;
END;
$$;
