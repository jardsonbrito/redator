-- Remove a validação A-H da função delete_aluno_aguardando.
-- O sistema evoluiu para turmas dinâmicas; a restrição A-H é legado.
-- A proteção real é a checagem de assinatura ativa (mantida intacta).

CREATE OR REPLACE FUNCTION delete_aluno_aguardando(
  p_aluno_id UUID,
  p_email    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma    TEXT;
  v_usertype TEXT;
  v_tem_assinatura_ativa BOOLEAN;
  v_count_enviadas   BIGINT := 0;
  v_count_simulado   BIGINT := 0;
  v_count_exercicio  BIGINT := 0;
  v_count_lousa      BIGINT := 0;
BEGIN

  -- 1. Verificar existência e tipo
  SELECT turma, user_type
    INTO v_turma, v_usertype
    FROM profiles
   WHERE id = p_aluno_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado (id: %).', p_aluno_id;
  END IF;

  IF v_usertype <> 'aluno' THEN
    RAISE EXCEPTION 'Registro não é do tipo aluno (tipo: %).', v_usertype;
  END IF;

  -- 2. Bloquear se tiver assinatura ativa (proteção real, independente de turma)
  SELECT EXISTS (
    SELECT 1
      FROM assinaturas
     WHERE aluno_id    = p_aluno_id
       AND data_validade >= CURRENT_DATE
  ) INTO v_tem_assinatura_ativa;

  IF v_tem_assinatura_ativa THEN
    RAISE EXCEPTION
      'Operação bloqueada: este aluno possui assinatura ativa e não pode ser excluído permanentemente.';
  END IF;

  -- 3. Contar registros por email (retorno informativo)
  SELECT COUNT(*) INTO v_count_enviadas
    FROM redacoes_enviadas
   WHERE LOWER(email_aluno) = LOWER(p_email);

  SELECT COUNT(*) INTO v_count_simulado
    FROM redacoes_simulado
   WHERE LOWER(email_aluno) = LOWER(p_email);

  SELECT COUNT(*) INTO v_count_exercicio
    FROM redacoes_exercicio
   WHERE LOWER(email_aluno) = LOWER(p_email);

  SELECT COUNT(*) INTO v_count_lousa
    FROM lousa_resposta
   WHERE LOWER(email_aluno) = LOWER(p_email);

  -- 4. Excluir dados por email (tabelas sem CASCADE de profiles)
  DELETE FROM redacoes_enviadas  WHERE LOWER(email_aluno) = LOWER(p_email);
  DELETE FROM redacoes_simulado  WHERE LOWER(email_aluno) = LOWER(p_email);
  DELETE FROM redacoes_exercicio WHERE LOWER(email_aluno) = LOWER(p_email);
  DELETE FROM lousa_resposta     WHERE LOWER(email_aluno) = LOWER(p_email);

  -- 5. Excluir o perfil (ON DELETE CASCADE cuida de assinaturas, plan_overrides, etc.)
  DELETE FROM profiles WHERE id = p_aluno_id;

  RETURN jsonb_build_object(
    'success',                     true,
    'aluno_id',                    p_aluno_id,
    'email',                       p_email,
    'redacoes_enviadas_excluidas', v_count_enviadas,
    'redacoes_simulado_excluidas', v_count_simulado,
    'redacoes_exercicio_excluidas', v_count_exercicio,
    'lousa_respostas_excluidas',   v_count_lousa,
    'mensagem', 'Aluno excluído permanentemente com todos os dados associados.'
  );

END;
$$;

REVOKE ALL ON FUNCTION delete_aluno_aguardando(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_aluno_aguardando(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_aluno_aguardando(UUID, TEXT) TO service_role;
