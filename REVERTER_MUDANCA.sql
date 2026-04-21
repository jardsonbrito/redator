-- ======================================================================
-- REVERTER A MUDANÇA ERRADA - URGENTE
-- ======================================================================
-- Este script reverte o campo turma para o NOME da turma
-- e prepara para corrigir o filtro das abas usando turma_id
-- ======================================================================

-- 1. REVERTER: voltar turma para o NOME da turma
UPDATE profiles p
SET turma = t.nome
FROM turmas_alunos t
WHERE p.turma_id = t.id
  AND p.user_type = 'aluno';

-- 2. Recriar função CORRETAMENTE: salvar NOME da turma, não código
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
  SELECT * INTO v_convite
  FROM convites_alunos
  WHERE upper(codigo) = upper(p_codigo)
    AND usado = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'motivo', 'convite_invalido');
  END IF;

  IF v_convite.expira_em IS NOT NULL AND v_convite.expira_em < now() THEN
    RETURN jsonb_build_object('success', false, 'motivo', 'convite_expirado');
  END IF;

  IF v_convite.email_destinatario IS NOT NULL
     AND lower(v_convite.email_destinatario) != lower(p_email) THEN
    RETURN jsonb_build_object('success', false, 'motivo', 'email_nao_permitido');
  END IF;

  SELECT * INTO v_turma
  FROM turmas_alunos
  WHERE id = v_convite.turma_id
    AND ativo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'motivo', 'turma_inativa');
  END IF;

  SELECT * INTO v_profile
  FROM profiles
  WHERE lower(email) = lower(p_email)
    AND user_type = 'aluno';

  IF NOT FOUND THEN
    IF p_nome IS NULL OR trim(p_nome) = '' THEN
      RETURN jsonb_build_object('success', false, 'needs_name', true);
    END IF;

    v_primeiro  := split_part(trim(p_nome), ' ', 1);
    v_sobrenome := trim(substring(trim(p_nome) FROM length(v_primeiro) + 2));
    IF v_sobrenome = '' THEN v_sobrenome := '-'; END IF;

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
      v_turma.nome,  -- <<< NOME DA TURMA (REVERTIDO)
      v_turma.id,
      'aluno',
      true,
      true
    )
    RETURNING * INTO v_profile;
  ELSE
    UPDATE profiles
    SET
      turma = v_turma.nome,  -- <<< NOME DA TURMA (REVERTIDO)
      turma_id = v_turma.id,
      is_authenticated_student = true,
      ativo = true
    WHERE id = v_profile.id
    RETURNING * INTO v_profile;
  END IF;

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

-- 3. Verificar
SELECT email, turma, turma_id FROM profiles WHERE email = 'a@a.com';
