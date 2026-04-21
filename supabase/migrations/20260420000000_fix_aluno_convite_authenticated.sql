-- Fix: Garantir que alunos criados via convite tenham is_authenticated_student = true
-- E que o campo turma contenha o codigo_acesso (não o nome) para funcionar com as abas
-- Isso permite que eles apareçam na listagem de alunos do admin

-- 1. Atualizar profiles existentes que entraram por convite
-- Corrigir is_authenticated_student E sincronizar campo turma com codigo_acesso
UPDATE profiles p
SET
  is_authenticated_student = true,
  turma = t.codigo_acesso
FROM turmas_alunos t
WHERE p.turma_id = t.id
  AND p.user_type = 'aluno'
  AND (
    p.is_authenticated_student IS NOT true
    OR p.turma != t.codigo_acesso
  );

-- 2. Recriar função para incluir is_authenticated_student na criação
CREATE OR REPLACE FUNCTION public.aluno_entrar_por_convite(
  p_codigo text,
  p_email  text,
  p_nome   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convite   convites_alunos%ROWTYPE;
  v_turma     turmas_alunos%ROWTYPE;
  v_profile   profiles%ROWTYPE;
  v_primeiro  text;
  v_sobrenome text;
BEGIN
  -- Buscar convite não utilizado
  SELECT * INTO v_convite
  FROM convites_alunos
  WHERE upper(codigo) = upper(p_codigo)
    AND usado = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'motivo', 'convite_invalido');
  END IF;

  -- Verificar expiração
  IF v_convite.expira_em IS NOT NULL AND v_convite.expira_em < now() THEN
    RETURN jsonb_build_object('success', false, 'motivo', 'convite_expirado');
  END IF;

  -- Verificar e-mail restrito
  IF v_convite.email_destinatario IS NOT NULL
     AND lower(v_convite.email_destinatario) != lower(p_email) THEN
    RETURN jsonb_build_object('success', false, 'motivo', 'email_nao_permitido');
  END IF;

  -- Buscar turma (deve estar ativa)
  SELECT * INTO v_turma
  FROM turmas_alunos
  WHERE id = v_convite.turma_id
    AND ativo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'motivo', 'turma_inativa');
  END IF;

  -- Buscar perfil existente
  SELECT * INTO v_profile
  FROM profiles
  WHERE lower(email) = lower(p_email)
    AND user_type = 'aluno';

  IF NOT FOUND THEN
    -- Novo aluno: precisa do nome
    IF p_nome IS NULL OR trim(p_nome) = '' THEN
      RETURN jsonb_build_object('success', false, 'needs_name', true);
    END IF;

    -- Separar primeiro nome e sobrenome (sobrenome é NOT NULL na tabela)
    v_primeiro  := split_part(trim(p_nome), ' ', 1);
    v_sobrenome := trim(substring(trim(p_nome) FROM length(v_primeiro) + 2));
    IF v_sobrenome = '' THEN v_sobrenome := '-'; END IF;

    -- Criar perfil com is_authenticated_student = true
    -- IMPORTANTE: turma deve ser o codigo_acesso para funcionar com as abas
    INSERT INTO profiles (
      id,
      nome,
      sobrenome,
      email,
      turma,
      turma_id,
      user_type,
      ativo,
      is_authenticated_student
    )
    VALUES (
      gen_random_uuid(),
      v_primeiro,
      v_sobrenome,
      lower(p_email),
      v_turma.codigo_acesso,  -- CORRIGIDO: usar codigo_acesso em vez de nome
      v_turma.id,
      'aluno',
      true,
      true  -- NOVO: garantir que aluno apareça na listagem do admin
    )
    RETURNING * INTO v_profile;
  ELSE
    -- Aluno já cadastrado: garantir turma_id, turma (codigo_acesso) e is_authenticated_student
    IF v_profile.turma_id IS NULL OR v_profile.is_authenticated_student IS NOT true OR v_profile.turma != v_turma.codigo_acesso THEN
      UPDATE profiles
      SET
        turma = v_turma.codigo_acesso,  -- CORRIGIDO: atualizar para codigo_acesso
        turma_id = v_turma.id,
        is_authenticated_student = true,
        ativo = true
      WHERE id = v_profile.id
      RETURNING * INTO v_profile;
    END IF;
  END IF;

  -- Marcar convite como utilizado (uso único)
  UPDATE convites_alunos
  SET
    usado           = true,
    usado_por_email = lower(p_email),
    usado_em        = now()
  WHERE id = v_convite.id;

  RETURN jsonb_build_object(
    'success', true,
    'profile', jsonb_build_object(
      'nome',     v_profile.nome || ' ' || v_profile.sobrenome,
      'email',    v_profile.email,
      'turma',    v_profile.turma,
      'turma_id', v_turma.id::text
    )
  );
END;
$$;
