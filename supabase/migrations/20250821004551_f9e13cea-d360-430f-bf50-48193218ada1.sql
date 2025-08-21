-- Criar constraint única para evitar duplicatas
ALTER TABLE frequencias
  ADD CONSTRAINT IF NOT EXISTS uniq_freq UNIQUE (aluno_id, aula_id);

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

  -- Inserir ou atualizar frequência
  INSERT INTO frequencias (aluno_id, aula_id, entrada_at)
  VALUES (v_aluno_id, p_aula_id, now())
  ON CONFLICT (aluno_id, aula_id) DO UPDATE
    SET entrada_at = COALESCE(frequencias.entrada_at, EXCLUDED.entrada_at),
        updated_at = now()
  RETURNING frequencias.aluno_id, frequencias.aula_id, frequencias.entrada_at, frequencias.saida_at
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
  UPDATE frequencias
  SET saida_at = COALESCE(saida_at, now()), 
      updated_at = now()
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
  FROM frequencias f
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