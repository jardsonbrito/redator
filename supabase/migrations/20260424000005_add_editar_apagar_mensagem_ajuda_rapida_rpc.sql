-- Cria RPCs com SECURITY DEFINER para editar e apagar mensagens do Ajuda Rápida.
-- O UPDATE/DELETE direto na tabela era silenciosamente bloqueado pelo RLS mesmo
-- após adicionar as políticas, pois auth.email() retorna NULL para sessões anon.
-- As funções verificam a propriedade internamente e executam como postgres.

CREATE OR REPLACE FUNCTION public.editar_mensagem_ajuda_rapida(
  p_mensagem_id  UUID,
  p_novo_texto   TEXT,
  p_corretor_id  UUID    DEFAULT NULL,
  p_aluno_email  TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_mensagem public.ajuda_rapida_mensagens%ROWTYPE;
  v_aluno_id UUID;
BEGIN
  -- Buscar mensagem
  SELECT * INTO v_mensagem
  FROM public.ajuda_rapida_mensagens
  WHERE id = p_mensagem_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Mensagem não encontrada');
  END IF;

  -- Verificar propriedade
  IF p_corretor_id IS NOT NULL THEN
    -- Verificação para corretor
    IF v_mensagem.autor <> 'corretor' OR v_mensagem.corretor_id <> p_corretor_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'forbidden', 'message', 'Sem permissão para editar esta mensagem');
    END IF;
  ELSIF p_aluno_email IS NOT NULL THEN
    -- Verificação para aluno: resolver email → UUID
    SELECT id INTO v_aluno_id
    FROM public.profiles
    WHERE email = p_aluno_email AND user_type = 'aluno'
    LIMIT 1;

    IF v_aluno_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Aluno não encontrado');
    END IF;

    IF v_mensagem.autor <> 'aluno' OR v_mensagem.aluno_id <> v_aluno_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'forbidden', 'message', 'Sem permissão para editar esta mensagem');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'missing_identity', 'message', 'Identidade do usuário não fornecida');
  END IF;

  -- Executar edição
  UPDATE public.ajuda_rapida_mensagens
  SET
    mensagem   = p_novo_texto,
    editada    = true,
    editada_em = now()
  WHERE id = p_mensagem_id;

  RETURN jsonb_build_object('success', true, 'message', 'Mensagem editada com sucesso');
END;
$$;

CREATE OR REPLACE FUNCTION public.apagar_mensagem_ajuda_rapida(
  p_mensagem_id UUID,
  p_corretor_id UUID   DEFAULT NULL,
  p_aluno_email TEXT   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_mensagem public.ajuda_rapida_mensagens%ROWTYPE;
  v_aluno_id UUID;
BEGIN
  SELECT * INTO v_mensagem
  FROM public.ajuda_rapida_mensagens
  WHERE id = p_mensagem_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Mensagem não encontrada');
  END IF;

  IF p_corretor_id IS NOT NULL THEN
    IF v_mensagem.autor <> 'corretor' OR v_mensagem.corretor_id <> p_corretor_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'forbidden', 'message', 'Sem permissão para apagar esta mensagem');
    END IF;
  ELSIF p_aluno_email IS NOT NULL THEN
    SELECT id INTO v_aluno_id
    FROM public.profiles
    WHERE email = p_aluno_email AND user_type = 'aluno'
    LIMIT 1;

    IF v_aluno_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Aluno não encontrado');
    END IF;

    IF v_mensagem.autor <> 'aluno' OR v_mensagem.aluno_id <> v_aluno_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'forbidden', 'message', 'Sem permissão para apagar esta mensagem');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'missing_identity', 'message', 'Identidade do usuário não fornecida');
  END IF;

  DELETE FROM public.ajuda_rapida_mensagens WHERE id = p_mensagem_id;

  RETURN jsonb_build_object('success', true, 'message', 'Mensagem apagada com sucesso');
END;
$$;

GRANT EXECUTE ON FUNCTION public.editar_mensagem_ajuda_rapida(UUID, TEXT, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.apagar_mensagem_ajuda_rapida(UUID, UUID, TEXT)       TO authenticated, anon;
