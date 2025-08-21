-- Melhorar tabela presenca_aulas para suportar duracao e status
ALTER TABLE public.presenca_aulas 
ADD COLUMN IF NOT EXISTS duracao_minutos integer,
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('em_andamento', 'concluida'));

-- Criar índice único para evitar duplicatas
DROP INDEX IF EXISTS ux_presenca_aulas_aluno_aula;
CREATE UNIQUE INDEX ux_presenca_aulas_aluno_aula 
ON presenca_aulas (email_aluno, aula_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION touch_updated_at() 
RETURNS trigger AS $$
BEGIN 
  NEW.atualizado_em = now(); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS t_presenca_touch ON presenca_aulas;
CREATE TRIGGER t_presenca_touch 
BEFORE UPDATE ON presenca_aulas
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Função para calcular duração e status automaticamente
CREATE OR REPLACE FUNCTION calc_duracao_minutos() 
RETURNS trigger AS $$
BEGIN
  IF (NEW.saida_at IS NOT NULL AND NEW.entrada_at IS NOT NULL) THEN
    NEW.duracao_minutos := CEIL(EXTRACT(EPOCH FROM (NEW.saida_at - NEW.entrada_at))/60.0);
    NEW.status := 'concluida';
  ELSIF (NEW.entrada_at IS NOT NULL AND NEW.saida_at IS NULL) THEN
    NEW.status := 'em_andamento';
  END IF;
  RETURN NEW;
END; 
$$ LANGUAGE plpgsql;

-- Trigger para calcular duração automaticamente
DROP TRIGGER IF EXISTS t_presenca_calc ON presenca_aulas;
CREATE TRIGGER t_presenca_calc 
BEFORE INSERT OR UPDATE ON presenca_aulas
FOR EACH ROW EXECUTE FUNCTION calc_duracao_minutos();

-- Função RPC para registrar entrada
CREATE OR REPLACE FUNCTION registrar_entrada_com_token(
  p_aula_id uuid,
  p_nome text,
  p_sobrenome text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_email text;
  now_fortaleza timestamptz;
  result_record record;
BEGIN
  -- Pegar email da configuração da sessão (será setado pelo frontend)
  session_email := current_setting('app.current_user_email', true);
  
  IF session_email IS NULL OR session_email = '' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'session_required',
      'message', 'Sessão não encontrada'
    );
  END IF;
  
  -- Timestamp em Fortaleza
  now_fortaleza := now() AT TIME ZONE 'America/Fortaleza';
  
  -- Inserir ou atualizar presença
  INSERT INTO public.presenca_aulas (
    aula_id,
    email_aluno,
    nome_aluno,
    sobrenome_aluno,
    entrada_at,
    tipo_registro,
    turma,
    data_registro,
    criado_em,
    atualizado_em
  ) VALUES (
    p_aula_id,
    session_email,
    p_nome,
    p_sobrenome,
    now_fortaleza,
    'entrada',
    'Visitante', -- Padrão
    now_fortaleza,
    now_fortaleza,
    now_fortaleza
  )
  ON CONFLICT (email_aluno, aula_id) 
  DO UPDATE SET
    entrada_at = COALESCE(presenca_aulas.entrada_at, now_fortaleza),
    nome_aluno = p_nome,
    sobrenome_aluno = p_sobrenome,
    atualizado_em = now_fortaleza
  RETURNING * INTO result_record;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Entrada registrada com sucesso',
    'data', to_jsonb(result_record)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error', 
      'message', SQLERRM
    );
END;
$$;

-- Função RPC para registrar saída
CREATE OR REPLACE FUNCTION registrar_saida_com_token(
  p_aula_id uuid,
  p_nome text,
  p_sobrenome text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_email text;
  now_fortaleza timestamptz;
  result_record record;
BEGIN
  -- Pegar email da configuração da sessão
  session_email := current_setting('app.current_user_email', true);
  
  IF session_email IS NULL OR session_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'session_required', 
      'message', 'Sessão não encontrada'
    );
  END IF;
  
  -- Timestamp em Fortaleza
  now_fortaleza := now() AT TIME ZONE 'America/Fortaleza';
  
  -- Atualizar saída ou criar registro completo
  UPDATE public.presenca_aulas 
  SET 
    saida_at = now_fortaleza,
    tipo_registro = 'saida',
    atualizado_em = now_fortaleza
  WHERE email_aluno = session_email 
    AND aula_id = p_aula_id
    AND saida_at IS NULL
  RETURNING * INTO result_record;
  
  -- Se não encontrou registro para atualizar, criar um completo
  IF result_record IS NULL THEN
    INSERT INTO public.presenca_aulas (
      aula_id,
      email_aluno, 
      nome_aluno,
      sobrenome_aluno,
      entrada_at,
      saida_at,
      tipo_registro,
      turma,
      data_registro,
      criado_em,
      atualizado_em
    ) VALUES (
      p_aula_id,
      session_email,
      p_nome,
      p_sobrenome,
      now_fortaleza,
      now_fortaleza,
      'saida',
      'Visitante',
      now_fortaleza,
      now_fortaleza,
      now_fortaleza
    )
    ON CONFLICT (email_aluno, aula_id) 
    DO UPDATE SET
      saida_at = now_fortaleza,
      nome_aluno = p_nome,
      sobrenome_aluno = p_sobrenome,
      atualizado_em = now_fortaleza
    RETURNING * INTO result_record;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Saída registrada com sucesso',
    'data', to_jsonb(result_record)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'database_error',
      'message', SQLERRM
    );
END;
$$;