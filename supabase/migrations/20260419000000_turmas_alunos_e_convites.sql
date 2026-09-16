-- Turmas dinâmicas de alunos (modelo paralelo ao de professores)
CREATE TABLE public.turmas_alunos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  codigo_acesso text NOT NULL UNIQUE,
  descricao     text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.turmas_alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total admin turmas_alunos"
  ON public.turmas_alunos FOR ALL USING (true) WITH CHECK (true);

-- Convites individuais de uso único para alunos
CREATE TABLE public.convites_alunos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo              text NOT NULL UNIQUE,
  email_destinatario  text,
  turma_id            uuid NOT NULL REFERENCES public.turmas_alunos(id) ON DELETE CASCADE,
  usado               boolean NOT NULL DEFAULT false,
  usado_por_email     text,
  usado_em            timestamptz,
  expira_em           timestamptz,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.convites_alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total admin convites_alunos"
  ON public.convites_alunos FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública convites_alunos"
  ON public.convites_alunos FOR SELECT USING (true);

-- Coluna turma_id em profiles — nullable para não afetar alunos existentes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES public.turmas_alunos(id) ON DELETE SET NULL;

-- RPC: valida convite, cria/atualiza perfil, marca convite como usado
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

    -- Criar perfil com id explícito, sobrenome e duplo vínculo de turma
    INSERT INTO profiles (id, nome, sobrenome, email, turma, turma_id, user_type, ativo)
    VALUES (
      gen_random_uuid(),
      v_primeiro,
      v_sobrenome,
      lower(p_email),
      v_turma.nome,
      v_turma.id,
      'aluno',
      true
    )
    RETURNING * INTO v_profile;
  ELSE
    -- Aluno já cadastrado: garantir turma_id se ainda não tinha
    IF v_profile.turma_id IS NULL THEN
      UPDATE profiles
      SET turma_id = v_turma.id
      WHERE id = v_profile.id;
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
