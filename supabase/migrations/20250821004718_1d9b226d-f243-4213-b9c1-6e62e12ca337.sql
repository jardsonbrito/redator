-- Verificar e criar constraint única para evitar duplicatas (usando tabela presenca_aulas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uniq_presenca' 
        AND table_name = 'presenca_aulas'
    ) THEN
        ALTER TABLE presenca_aulas ADD CONSTRAINT uniq_presenca UNIQUE (aluno_id, aula_id);
    END IF;
END $$;

-- Função para registrar entrada
CREATE OR REPLACE FUNCTION public.registrar_entrada(p_email text, p_aula_id uuid)
RETURNS TABLE(aluno_id uuid, aula_id uuid, entrada_at timestamptz, saida_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_aluno_id uuid;
BEGIN
  -- Buscar aluno pelo email nos profiles (sistema atual)
  SELECT p.id INTO v_aluno_id 
  FROM profiles p 
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email)) 
    AND p.user_type = 'aluno' 
    AND p.ativo = true 
  LIMIT 1;
  
  IF v_aluno_id IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado para email: %', p_email USING ERRCODE = 'P0001';
  END IF;

  -- Inserir ou atualizar presença
  INSERT INTO presenca_aulas (aluno_id, aula_id, entrada_at, nome_aluno, email_aluno, turma, tipo_registro)
  VALUES (v_aluno_id, p_aula_id, now(), 
    (SELECT nome FROM profiles WHERE id = v_aluno_id),
    p_email,
    (SELECT turma FROM profiles WHERE id = v_aluno_id),
    'entrada')
  ON CONFLICT (aluno_id, aula_id) DO UPDATE
    SET entrada_at = COALESCE(presenca_aulas.entrada_at, EXCLUDED.entrada_at),
        atualizado_em = now()
  RETURNING presenca_aulas.aluno_id, presenca_aulas.aula_id, presenca_aulas.entrada_at, presenca_aulas.saida_at
  INTO aluno_id, aula_id, entrada_at, saida_at;

  RETURN NEXT;
END;
$$;

-- Função para registrar saída
CREATE OR REPLACE FUNCTION public.registrar_saida(p_email text, p_aula_id uuid)
RETURNS TABLE(aluno_id uuid, aula_id uuid, entrada_at timestamptz, saida_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_aluno_id uuid;
BEGIN
  -- Buscar aluno pelo email nos profiles (sistema atual)
  SELECT p.id INTO v_aluno_id 
  FROM profiles p 
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email)) 
    AND p.user_type = 'aluno' 
    AND p.ativo = true 
  LIMIT 1;
  
  IF v_aluno_id IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado para email: %', p_email USING ERRCODE = 'P0001';
  END IF;

  -- Atualizar saída se há entrada registrada
  UPDATE presenca_aulas
  SET saida_at = COALESCE(saida_at, now()), 
      atualizado_em = now(),
      tipo_registro = 'saida'
  WHERE aluno_id = v_aluno_id AND aula_id = p_aula_id
  RETURNING aluno_id, aula_id, entrada_at, saida_at
  INTO aluno_id, aula_id, entrada_at, saida_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não há entrada registrada para registrar saída' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEXT;
END;
$$;

-- Função para verificar presença atual
CREATE OR REPLACE FUNCTION public.verificar_presenca(p_email text, p_aula_id uuid)
RETURNS TABLE(aluno_id uuid, aula_id uuid, entrada_at timestamptz, saida_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_aluno_id uuid;
BEGIN
  -- Buscar aluno pelo email nos profiles
  SELECT p.id INTO v_aluno_id 
  FROM profiles p 
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email)) 
    AND p.user_type = 'aluno' 
    AND p.ativo = true 
  LIMIT 1;
  
  IF v_aluno_id IS NULL THEN
    RETURN; -- Retorna vazio se aluno não encontrado
  END IF;

  -- Retornar dados de presença se existir
  RETURN QUERY
  SELECT f.aluno_id, f.aula_id, f.entrada_at, f.saida_at
  FROM presenca_aulas f
  WHERE f.aluno_id = v_aluno_id AND f.aula_id = p_aula_id;
END;
$$;

-- Conceder permissões para usuários anônimos
GRANT EXECUTE ON FUNCTION public.registrar_entrada(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.registrar_saida(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.verificar_presenca(text, uuid) TO anon;

-- Definir owner das funções
ALTER FUNCTION public.registrar_entrada(text, uuid) OWNER TO postgres;
ALTER FUNCTION public.registrar_saida(text, uuid) OWNER TO postgres;
ALTER FUNCTION public.verificar_presenca(text, uuid) OWNER TO postgres;