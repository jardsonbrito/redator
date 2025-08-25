-- Criar tabela de configurações globais do app
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_allowed_weekdays_for_topics smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  free_topic_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inserir configuração inicial se não existir
INSERT INTO public.app_settings (submission_allowed_weekdays_for_topics, free_topic_enabled)
SELECT '{1,2,3,4,5}', true
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Criar view pública somente leitura
CREATE OR REPLACE VIEW public.public_app_settings AS
SELECT submission_allowed_weekdays_for_topics, free_topic_enabled, updated_at
FROM public.app_settings
ORDER BY updated_at DESC
LIMIT 1;

-- Habilitar RLS na tabela base
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Política apenas para admins na tabela base
CREATE POLICY "Only admin can manage app_settings" ON public.app_settings
FOR ALL USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- Permitir leitura da view para todos
GRANT SELECT ON public.public_app_settings TO anon, authenticated;

-- RPC para admin alterar configurações
CREATE OR REPLACE FUNCTION public.set_app_settings(
  p_weekdays_for_topics smallint[],
  p_free_topic_enabled boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é admin principal
  IF NOT public.is_main_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores principais podem alterar configurações';
  END IF;
  
  -- Validar que pelo menos um dia está selecionado
  IF array_length(p_weekdays_for_topics, 1) IS NULL OR array_length(p_weekdays_for_topics, 1) = 0 THEN
    RAISE EXCEPTION 'Pelo menos um dia da semana deve estar selecionado para envios por tema';
  END IF;

  -- Atualizar ou inserir configurações
  INSERT INTO public.app_settings (submission_allowed_weekdays_for_topics, free_topic_enabled, updated_at)
  VALUES (p_weekdays_for_topics, p_free_topic_enabled, now())
  ON CONFLICT (id) DO UPDATE SET
    submission_allowed_weekdays_for_topics = EXCLUDED.submission_allowed_weekdays_for_topics,
    free_topic_enabled = EXCLUDED.free_topic_enabled,
    updated_at = now();
  
  -- Se não há registro ainda, garantir que há pelo menos um
  IF NOT EXISTS (SELECT 1 FROM public.app_settings) THEN
    INSERT INTO public.app_settings (submission_allowed_weekdays_for_topics, free_topic_enabled)
    VALUES (p_weekdays_for_topics, p_free_topic_enabled);
  ELSE
    UPDATE public.app_settings 
    SET submission_allowed_weekdays_for_topics = p_weekdays_for_topics,
        free_topic_enabled = p_free_topic_enabled,
        updated_at = now();
  END IF;
END;
$$;

-- Conceder execução da função apenas para autenticados
GRANT EXECUTE ON FUNCTION public.set_app_settings(smallint[], boolean) TO authenticated;

-- Trigger de enforcement para redacoes_enviadas
CREATE OR REPLACE FUNCTION public.enforce_submission_policies()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekdays smallint[];
  v_free_enabled boolean;
  v_today smallint;
  v_tema_id uuid;
BEGIN
  -- Buscar configurações atuais
  SELECT submission_allowed_weekdays_for_topics, free_topic_enabled
    INTO v_weekdays, v_free_enabled
  FROM public.public_app_settings;
  
  -- Se não há configurações, usar padrões
  IF v_weekdays IS NULL THEN
    v_weekdays := '{1,2,3,4,5}';
  END IF;
  
  IF v_free_enabled IS NULL THEN
    v_free_enabled := true;
  END IF;

  -- Dia da semana atual (0=Dom, 1=Seg, ..., 6=Sáb)
  v_today := EXTRACT(dow FROM timezone('America/Fortaleza', now()))::smallint;
  
  -- Determinar se é tema livre baseado no tipo_envio ou falta de tema_id
  -- Assumindo que tema livre tem tipo_envio='tema_livre' ou não tem tema na URL
  IF NEW.tipo_envio = 'tema_livre' OR 
     (NEW.frase_tematica IS NOT NULL AND NEW.frase_tematica NOT ILIKE '%tema%' AND 
      (SELECT COUNT(*) FROM public.temas WHERE frase_tematica = NEW.frase_tematica) = 0) THEN
    -- É Tema Livre
    IF v_free_enabled IS FALSE THEN
      RAISE EXCEPTION 'Envio por Tema Livre está desabilitado pelo administrador';
    END IF;
  ELSE
    -- É envio por tema específico (regular/simulado)
    IF NOT (v_today = ANY(v_weekdays)) THEN
      RAISE EXCEPTION 'Envios por tema não estão liberados hoje. Consulte os dias permitidos.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela redacoes_enviadas
DROP TRIGGER IF EXISTS trg_enforce_submission_policies ON public.redacoes_enviadas;
CREATE TRIGGER trg_enforce_submission_policies
  BEFORE INSERT ON public.redacoes_enviadas
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_submission_policies();