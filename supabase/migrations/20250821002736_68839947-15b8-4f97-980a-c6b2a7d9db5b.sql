-- Add unique constraint for attendance records (check if exists first)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uniq_presenca_aula_aluno'
    ) THEN
        ALTER TABLE presenca_aulas 
        ADD CONSTRAINT uniq_presenca_aula_aluno 
        UNIQUE (email_aluno, aula_id);
    END IF;
END $$;

-- Function: Register entrance
CREATE OR REPLACE FUNCTION public.registrar_entrada_sem_auth(p_email text, p_aula_id uuid)
RETURNS TABLE(
  aluno_id uuid, 
  aula_id uuid, 
  entrada_at timestamptz, 
  saida_at timestamptz,
  nome_aluno text,
  email_aluno text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_aluno_record RECORD;
BEGIN
  -- 1) Find student by email from profiles table
  SELECT p.id, p.nome, p.sobrenome, p.email, p.turma
  INTO v_aluno_record
  FROM profiles p
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
    AND p.user_type = 'aluno'
    AND p.ativo = true
  LIMIT 1;

  IF v_aluno_record.id IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado para o e-mail %', p_email USING ERRCODE = 'P0001';
  END IF;

  -- 2) UPSERT idempotent entry
  INSERT INTO presenca_aulas (
    aluno_id, 
    aula_id, 
    email_aluno, 
    nome_aluno, 
    sobrenome_aluno,
    turma,
    entrada_at, 
    tipo_registro,
    data_registro,
    criado_em
  )
  VALUES (
    v_aluno_record.id, 
    p_aula_id, 
    v_aluno_record.email,
    v_aluno_record.nome,
    COALESCE(v_aluno_record.sobrenome, ''),
    COALESCE(v_aluno_record.turma, 'visitante'),
    NOW(), 
    'entrada',
    NOW(),
    NOW()
  )
  ON CONFLICT (email_aluno, aula_id) 
  DO UPDATE SET
    entrada_at = COALESCE(presenca_aulas.entrada_at, EXCLUDED.entrada_at),
    atualizado_em = NOW()
  RETURNING 
    presenca_aulas.aluno_id, 
    presenca_aulas.aula_id, 
    presenca_aulas.entrada_at, 
    presenca_aulas.saida_at,
    presenca_aulas.nome_aluno,
    presenca_aulas.email_aluno
  INTO aluno_id, aula_id, entrada_at, saida_at, nome_aluno, email_aluno;

  RETURN NEXT;
END;
$$;

-- Function: Register exit
CREATE OR REPLACE FUNCTION public.registrar_saida_sem_auth(p_email text, p_aula_id uuid)
RETURNS TABLE(
  aluno_id uuid, 
  aula_id uuid, 
  entrada_at timestamptz, 
  saida_at timestamptz,
  nome_aluno text,
  email_aluno text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_aluno_record RECORD;
BEGIN
  -- 1) Find student by email
  SELECT p.id, p.nome, p.sobrenome, p.email, p.turma
  INTO v_aluno_record
  FROM profiles p
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
    AND p.user_type = 'aluno'
    AND p.ativo = true
  LIMIT 1;

  IF v_aluno_record.id IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado para o e-mail %', p_email USING ERRCODE = 'P0001';
  END IF;

  -- 2) Update exit time (idempotent)
  UPDATE presenca_aulas
  SET 
    saida_at = COALESCE(saida_at, NOW()),
    tipo_registro = 'saida',
    atualizado_em = NOW()
  WHERE email_aluno = LOWER(TRIM(p_email))
    AND aula_id = p_aula_id
    AND entrada_at IS NOT NULL  -- Must have entrance first
  RETURNING 
    aluno_id, 
    aula_id, 
    entrada_at, 
    saida_at,
    nome_aluno,
    email_aluno
  INTO aluno_id, aula_id, entrada_at, saida_at, nome_aluno, email_aluno;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não há entrada registrada para saída do aluno % na aula %', p_email, p_aula_id USING ERRCODE = 'P0001';
  END IF;

  RETURN NEXT;
END;
$$;

-- Grant execution permissions to anon
GRANT EXECUTE ON FUNCTION public.registrar_entrada_sem_auth(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.registrar_saida_sem_auth(text, uuid) TO anon;

-- Function to check attendance status
CREATE OR REPLACE FUNCTION public.verificar_presenca_aluno(p_email text, p_aula_id uuid)
RETURNS TABLE(
  entrada_at timestamptz, 
  saida_at timestamptz,
  tem_entrada boolean,
  tem_saida boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.entrada_at,
    pa.saida_at,
    (pa.entrada_at IS NOT NULL) as tem_entrada,
    (pa.saida_at IS NOT NULL) as tem_saida
  FROM presenca_aulas pa
  WHERE LOWER(TRIM(pa.email_aluno)) = LOWER(TRIM(p_email))
    AND pa.aula_id = p_aula_id
  LIMIT 1;
  
  -- If no record found, return false values
  IF NOT FOUND THEN
    entrada_at := NULL;
    saida_at := NULL;
    tem_entrada := FALSE;
    tem_saida := FALSE;
    RETURN NEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_presenca_aluno(text, uuid) TO anon;