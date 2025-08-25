-- Corrigir a função set_app_settings para evitar UPDATE sem WHERE clause
CREATE OR REPLACE FUNCTION public.set_app_settings(
  p_weekdays_for_topics smallint[],
  p_free_topic_enabled boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  settings_count integer;
BEGIN
  -- Verificar se é admin principal
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores principais podem alterar configurações';
  END IF;
  
  -- Validar que pelo menos um dia está selecionado
  IF array_length(p_weekdays_for_topics, 1) IS NULL OR array_length(p_weekdays_for_topics, 1) = 0 THEN
    RAISE EXCEPTION 'Pelo menos um dia da semana deve estar selecionado para envios por tema';
  END IF;

  -- Verificar quantos registros existem
  SELECT COUNT(*) INTO settings_count FROM public.app_settings;
  
  IF settings_count = 0 THEN
    -- Inserir primeiro registro
    INSERT INTO public.app_settings (submission_allowed_weekdays_for_topics, free_topic_enabled, updated_at)
    VALUES (p_weekdays_for_topics, p_free_topic_enabled, now());
  ELSE
    -- Atualizar registro mais recente
    UPDATE public.app_settings 
    SET submission_allowed_weekdays_for_topics = p_weekdays_for_topics,
        free_topic_enabled = p_free_topic_enabled,
        updated_at = now()
    WHERE id = (
      SELECT id FROM public.app_settings 
      ORDER BY updated_at DESC 
      LIMIT 1
    );
  END IF;
END;
$$;