-- Corrigir função registrar_entrada para resolver ambiguidade de colunas
CREATE OR REPLACE FUNCTION public.registrar_entrada(p_email text, p_aula_id uuid)
RETURNS TABLE(aluno_id uuid, aula_id uuid, entrada_at timestamptz, saida_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_aluno_id uuid;
  v_nome_aluno text;
  v_turma_aluno text;
BEGIN
  -- Buscar aluno pelo email nos profiles (sistema atual)
  SELECT p.id, p.nome, p.turma INTO v_aluno_id, v_nome_aluno, v_turma_aluno
  FROM profiles p 
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email)) 
    AND p.user_type = 'aluno' 
    AND p.ativo = true 
  LIMIT 1;
  
  IF v_aluno_id IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado para email: %', p_email USING ERRCODE = 'P0001';
  END IF;

  -- Inserir ou atualizar presença (especificar tabela nas referências)
  INSERT INTO presenca_aulas (aluno_id, aula_id, entrada_at, nome_aluno, email_aluno, turma, tipo_registro)
  VALUES (v_aluno_id, p_aula_id, now(), v_nome_aluno, p_email, v_turma_aluno, 'entrada')
  ON CONFLICT (aluno_id, aula_id) DO UPDATE
    SET entrada_at = COALESCE(presenca_aulas.entrada_at, EXCLUDED.entrada_at),
        atualizado_em = now(),
        tipo_registro = 'entrada'
  RETURNING presenca_aulas.aluno_id, presenca_aulas.aula_id, presenca_aulas.entrada_at, presenca_aulas.saida_at
  INTO aluno_id, aula_id, entrada_at, saida_at;

  RETURN NEXT;
END;
$$;

-- Corrigir função registrar_saida também
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

  -- Atualizar saída se há entrada registrada (especificar tabela claramente)
  UPDATE presenca_aulas
  SET saida_at = COALESCE(presenca_aulas.saida_at, now()), 
      atualizado_em = now(),
      tipo_registro = 'saida'
  WHERE presenca_aulas.aluno_id = v_aluno_id AND presenca_aulas.aula_id = p_aula_id
  RETURNING presenca_aulas.aluno_id, presenca_aulas.aula_id, presenca_aulas.entrada_at, presenca_aulas.saida_at
  INTO aluno_id, aula_id, entrada_at, saida_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não há entrada registrada para registrar saída' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEXT;
END;
$$;