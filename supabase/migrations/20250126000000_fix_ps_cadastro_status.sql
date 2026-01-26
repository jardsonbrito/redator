-- Migration: Corrigir status inicial do candidato no processo seletivo
-- Data: 2025-01-26
-- Descrição: Altera o status inicial do candidato de 'formulario_enviado' para 'nao_inscrito'
--            para que o candidato possa preencher o questionário após se cadastrar

-- Recriar função com status correto
CREATE OR REPLACE FUNCTION cadastrar_candidato_processo_seletivo(
  p_nome TEXT,
  p_email TEXT,
  p_formulario_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_turma_processo TEXT;
  v_profile_id UUID;
  v_candidato_id UUID;
  v_existing_profile UUID;
  v_existing_candidato UUID;
  v_inscricoes_abertas BOOLEAN;
  v_ativo BOOLEAN;
BEGIN
  -- Verificar se formulário existe e está com inscrições abertas
  SELECT turma_processo, inscricoes_abertas, ativo
  INTO v_turma_processo, v_inscricoes_abertas, v_ativo
  FROM ps_formularios
  WHERE id = p_formulario_id;

  IF v_turma_processo IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Processo seletivo não encontrado');
  END IF;

  IF NOT v_ativo THEN
    RETURN json_build_object('success', false, 'error', 'Processo seletivo não está ativo');
  END IF;

  IF NOT v_inscricoes_abertas THEN
    RETURN json_build_object('success', false, 'error', 'As inscrições para este processo seletivo estão encerradas');
  END IF;

  -- Verificar se email já existe como candidato deste processo
  SELECT id INTO v_existing_candidato
  FROM ps_candidatos
  WHERE email_aluno = LOWER(TRIM(p_email))
    AND formulario_id = p_formulario_id;

  IF v_existing_candidato IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Você já está inscrito neste processo seletivo');
  END IF;

  -- Verificar se email já existe como profile
  SELECT id INTO v_existing_profile
  FROM profiles
  WHERE email = LOWER(TRIM(p_email));

  IF v_existing_profile IS NOT NULL THEN
    -- Usar profile existente, mas não alterar a turma dele
    v_profile_id := v_existing_profile;
  ELSE
    -- Criar novo profile (JÁ APROVADO, sem necessidade de aprovação)
    v_profile_id := gen_random_uuid();

    INSERT INTO profiles (
      id,
      nome,
      sobrenome,
      email,
      turma,
      user_type,
      is_authenticated_student,
      ativo,
      status_aprovacao,
      data_solicitacao,
      data_aprovacao
    ) VALUES (
      v_profile_id,
      TRIM(p_nome),
      '',
      LOWER(TRIM(p_email)),
      v_turma_processo,  -- Turma do processo seletivo
      'aluno',
      true,
      true,              -- JÁ ATIVO (sem aprovação)
      'ativo',           -- JÁ APROVADO
      NOW(),
      NOW()
    );
  END IF;

  -- Criar candidato no processo seletivo
  -- STATUS INICIAL: 'nao_inscrito' para que o candidato preencha o questionário
  INSERT INTO ps_candidatos (
    id,
    formulario_id,
    aluno_id,
    email_aluno,
    nome_aluno,
    turma,
    status,
    data_inscricao
  ) VALUES (
    gen_random_uuid(),
    p_formulario_id,
    v_profile_id,
    LOWER(TRIM(p_email)),
    TRIM(p_nome),
    v_turma_processo,
    'nao_inscrito',  -- CORRIGIDO: Agora começa como 'nao_inscrito' para preencher formulário
    NOW()
  )
  RETURNING id INTO v_candidato_id;

  RETURN json_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'candidato_id', v_candidato_id,
    'turma', v_turma_processo,
    'is_new_profile', v_existing_profile IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar comentário
COMMENT ON FUNCTION cadastrar_candidato_processo_seletivo(TEXT, TEXT, UUID) IS 'Cadastra candidato via link público com status nao_inscrito para preencher questionário';
