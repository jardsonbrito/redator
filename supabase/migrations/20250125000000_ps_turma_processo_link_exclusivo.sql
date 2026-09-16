-- Migration: Sistema de Link Exclusivo e Turma para Processo Seletivo
-- Data: 2025-01-25
-- Descrição: Adiciona turma exclusiva para processo seletivo, função de cadastro automático e migração de candidatos

-- 1. Adicionar campo de turma ao formulário de processo seletivo
ALTER TABLE ps_formularios
ADD COLUMN IF NOT EXISTS turma_processo TEXT;

-- 2. Atualizar constraint de turma no profiles para aceitar turmas de PS
-- Primeiro, remover constraint existente se houver
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS valid_turma_check;

-- Adicionar nova constraint que aceita turmas normais e turmas de processo seletivo (PS-XXXX)
ALTER TABLE profiles
ADD CONSTRAINT valid_turma_check
CHECK (
  turma IS NULL OR
  turma = '' OR
  turma IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'VISITANTE', 'AGUARDANDO', 'REPROVADOS') OR
  turma LIKE 'PS-%'  -- Turmas de processo seletivo
);

-- 3. Função para gerar turma do processo seletivo automaticamente
CREATE OR REPLACE FUNCTION gerar_turma_processo_seletivo(formulario_id UUID)
RETURNS TEXT AS $$
DECLARE
  ano_atual TEXT;
  contador INT;
  turma_nome TEXT;
BEGIN
  ano_atual := EXTRACT(YEAR FROM NOW())::TEXT;

  -- Contar quantos processos já existem no ano
  SELECT COUNT(*) INTO contador
  FROM ps_formularios
  WHERE turma_processo LIKE 'PS-' || ano_atual || '-%';

  turma_nome := 'PS-' || ano_atual || '-' || LPAD((contador + 1)::TEXT, 2, '0');

  RETURN turma_nome;
END;
$$ LANGUAGE plpgsql;

-- 4. Função para gerar e atribuir turma ao processo seletivo
CREATE OR REPLACE FUNCTION gerar_e_atribuir_turma_processo(formulario_id UUID)
RETURNS TEXT AS $$
DECLARE
  turma_gerada TEXT;
BEGIN
  -- Verificar se já tem turma
  SELECT turma_processo INTO turma_gerada
  FROM ps_formularios
  WHERE id = formulario_id;

  IF turma_gerada IS NOT NULL THEN
    RETURN turma_gerada;
  END IF;

  -- Gerar nova turma
  turma_gerada := gerar_turma_processo_seletivo(formulario_id);

  -- Atualizar o formulário
  UPDATE ps_formularios
  SET turma_processo = turma_gerada
  WHERE id = formulario_id;

  RETURN turma_gerada;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para cadastrar candidato do processo seletivo sem aprovação manual
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
    'formulario_enviado',
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

-- 6. Função para migrar candidato aprovado para turma regular
CREATE OR REPLACE FUNCTION migrar_candidato_para_turma(
  p_candidato_id UUID,
  p_turma_destino TEXT,
  p_ativar_plano BOOLEAN DEFAULT false,
  p_plano TEXT DEFAULT NULL,
  p_dias_validade INT DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  v_aluno_id UUID;
  v_assinatura_id UUID;
  v_nome_aluno TEXT;
BEGIN
  -- Buscar o aluno_id e nome do candidato
  SELECT aluno_id, nome_aluno INTO v_aluno_id, v_nome_aluno
  FROM ps_candidatos
  WHERE id = p_candidato_id;

  IF v_aluno_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Candidato não encontrado ou sem perfil vinculado');
  END IF;

  -- Atualizar turma do profile
  UPDATE profiles
  SET
    turma = p_turma_destino,
    participou_processo_seletivo = true,
    updated_at = NOW()
  WHERE id = v_aluno_id;

  -- Se deve ativar plano
  IF p_ativar_plano AND p_plano IS NOT NULL THEN
    -- Verificar se já existe assinatura ativa
    DELETE FROM assinaturas
    WHERE aluno_id = v_aluno_id
    AND data_validade < CURRENT_DATE;

    INSERT INTO assinaturas (
      id,
      aluno_id,
      plano,
      data_inscricao,
      data_validade,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_aluno_id,
      p_plano,
      CURRENT_DATE,
      CURRENT_DATE + p_dias_validade,
      NOW()
    )
    RETURNING id INTO v_assinatura_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'aluno_id', v_aluno_id,
    'nome_aluno', v_nome_aluno,
    'turma_nova', p_turma_destino,
    'assinatura_id', v_assinatura_id,
    'plano_ativado', p_ativar_plano AND p_plano IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função para migrar múltiplos candidatos de uma vez
CREATE OR REPLACE FUNCTION migrar_candidatos_em_lote(
  p_candidato_ids UUID[],
  p_turma_destino TEXT,
  p_ativar_plano BOOLEAN DEFAULT false,
  p_plano TEXT DEFAULT NULL,
  p_dias_validade INT DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  v_candidato_id UUID;
  v_resultado JSON;
  v_sucessos INT := 0;
  v_erros INT := 0;
  v_resultados JSON[] := '{}';
BEGIN
  FOREACH v_candidato_id IN ARRAY p_candidato_ids
  LOOP
    v_resultado := migrar_candidato_para_turma(
      v_candidato_id,
      p_turma_destino,
      p_ativar_plano,
      p_plano,
      p_dias_validade
    );

    IF (v_resultado->>'success')::boolean THEN
      v_sucessos := v_sucessos + 1;
    ELSE
      v_erros := v_erros + 1;
    END IF;

    v_resultados := array_append(v_resultados, v_resultado);
  END LOOP;

  RETURN json_build_object(
    'success', v_erros = 0,
    'total', array_length(p_candidato_ids, 1),
    'sucessos', v_sucessos,
    'erros', v_erros,
    'resultados', v_resultados
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Criar índice para melhor performance na busca por turma de processo
CREATE INDEX IF NOT EXISTS idx_ps_formularios_turma_processo
ON ps_formularios(turma_processo);

CREATE INDEX IF NOT EXISTS idx_ps_candidatos_formulario_email
ON ps_candidatos(formulario_id, email_aluno);

-- 9. Comentários para documentação
COMMENT ON COLUMN ps_formularios.turma_processo IS 'Turma exclusiva gerada para candidatos deste processo seletivo (formato: PS-YYYY-NN)';
COMMENT ON FUNCTION gerar_turma_processo_seletivo(UUID) IS 'Gera código de turma no formato PS-YYYY-NN para processo seletivo';
COMMENT ON FUNCTION cadastrar_candidato_processo_seletivo(TEXT, TEXT, UUID) IS 'Cadastra candidato via link público, criando profile já aprovado se não existir';
COMMENT ON FUNCTION migrar_candidato_para_turma(UUID, TEXT, BOOLEAN, TEXT, INT) IS 'Migra candidato aprovado do PS para turma regular, opcionalmente ativando plano';
COMMENT ON FUNCTION migrar_candidatos_em_lote(UUID[], TEXT, BOOLEAN, TEXT, INT) IS 'Migra múltiplos candidatos de uma vez para turma regular';
