-- Garante, a nível de banco, que nenhum registro com período (data/hora início x fim)
-- possa ser salvo com o término anterior ou igual ao início.
-- Motivação: o agendamento de simulados aceitava data_fim < data_inicio, causando
-- erro para o aluno ao tentar enviar a redação.

ALTER TABLE public.simulados
  ADD CONSTRAINT chk_simulados_periodo_valido
  CHECK ((data_fim + hora_fim) > (data_inicio + hora_inicio));

ALTER TABLE public.exercicios
  ADD CONSTRAINT chk_exercicios_periodo_valido
  CHECK (
    data_inicio IS NULL OR data_fim IS NULL OR hora_inicio IS NULL OR hora_fim IS NULL
    OR (data_fim + hora_fim) > (data_inicio + hora_inicio)
  );

ALTER TABLE public.ps_etapa_final
  ADD CONSTRAINT chk_ps_etapa_final_periodo_valido
  CHECK (
    data_inicio IS NULL OR data_fim IS NULL OR hora_inicio IS NULL OR hora_fim IS NULL
    OR (data_fim + hora_fim) > (data_inicio + hora_inicio)
  );

ALTER TABLE public.etapas_estudo
  ADD CONSTRAINT chk_etapas_estudo_periodo_valido
  CHECK (data_fim > data_inicio);

-- RPCs do corretor: validar o período antes de gravar, com mensagem amigável
-- (o constraint acima ainda protege caso alguma outra via de escrita seja criada no futuro)

CREATE OR REPLACE FUNCTION public.criar_simulado_corretor(
  p_corretor_email text,
  p_titulo text,
  p_tema_id uuid,
  p_frase_tematica text,
  p_data_inicio date,
  p_hora_inicio time without time zone,
  p_data_fim date,
  p_hora_fim time without time zone,
  p_turmas_autorizadas text[],
  p_permite_visitante boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_corretor RECORD;
  v_pode_gerenciar boolean;
  v_novo_id uuid;
BEGIN
  SELECT * INTO v_corretor FROM corretores WHERE email = p_corretor_email AND ativo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Corretor não encontrado.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM turmas_alunos
    WHERE nome = ANY(v_corretor.turmas_autorizadas) AND gerenciada_por = 'externo'
  ) INTO v_pode_gerenciar;

  IF NOT v_pode_gerenciar THEN
    RAISE EXCEPTION 'Sem permissão: suas turmas são gerenciadas pelo administrador.';
  END IF;

  IF (p_data_fim + p_hora_fim) <= (p_data_inicio + p_hora_inicio) THEN
    RAISE EXCEPTION 'A data/hora de encerramento deve ser posterior à data/hora de início.';
  END IF;

  INSERT INTO simulados (
    titulo, tema_id, frase_tematica,
    data_inicio, hora_inicio, data_fim, hora_fim,
    turmas_autorizadas, permite_visitante, ativo
  ) VALUES (
    p_titulo, p_tema_id, p_frase_tematica,
    p_data_inicio, p_hora_inicio, p_data_fim, p_hora_fim,
    p_turmas_autorizadas, p_permite_visitante, true
  ) RETURNING id INTO v_novo_id;

  RETURN v_novo_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.editar_simulado_corretor(
  p_corretor_email text,
  p_simulado_id uuid,
  p_titulo text,
  p_tema_id uuid,
  p_frase_tematica text,
  p_data_inicio date,
  p_hora_inicio time without time zone,
  p_data_fim date,
  p_hora_fim time without time zone,
  p_turmas_autorizadas text[],
  p_permite_visitante boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_corretor RECORD;
  v_simulado RECORD;
  v_pode_gerenciar boolean;
BEGIN
  SELECT * INTO v_corretor FROM corretores WHERE email = p_corretor_email AND ativo = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Corretor não encontrado.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM turmas_alunos
    WHERE nome = ANY(v_corretor.turmas_autorizadas) AND gerenciada_por = 'externo'
  ) INTO v_pode_gerenciar;

  IF NOT v_pode_gerenciar THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sem permissão: suas turmas são gerenciadas pelo administrador.');
  END IF;

  SELECT * INTO v_simulado FROM simulados WHERE id = p_simulado_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Simulado não encontrado.');
  END IF;

  IF NOT (
    v_simulado.turmas_autorizadas IS NULL OR
    array_length(v_simulado.turmas_autorizadas, 1) IS NULL OR
    v_simulado.turmas_autorizadas && v_corretor.turmas_autorizadas
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Acesso negado: simulado não pertence às suas turmas.');
  END IF;

  IF (p_data_fim + p_hora_fim) <= (p_data_inicio + p_hora_inicio) THEN
    RETURN jsonb_build_object('success', false, 'message', 'A data/hora de encerramento deve ser posterior à data/hora de início.');
  END IF;

  UPDATE simulados SET
    titulo = p_titulo,
    tema_id = p_tema_id,
    frase_tematica = p_frase_tematica,
    data_inicio = p_data_inicio,
    hora_inicio = p_hora_inicio,
    data_fim = p_data_fim,
    hora_fim = p_hora_fim,
    turmas_autorizadas = p_turmas_autorizadas,
    permite_visitante = p_permite_visitante
  WHERE id = p_simulado_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;
