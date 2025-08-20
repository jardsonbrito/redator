-- Criar tabela para tokens de sessão de alunos
CREATE TABLE IF NOT EXISTS public.student_session_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  turma TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_student_session_tokens_token ON public.student_session_tokens(token);
CREATE INDEX IF NOT EXISTS idx_student_session_tokens_email ON public.student_session_tokens(student_email);
CREATE INDEX IF NOT EXISTS idx_student_session_tokens_expires ON public.student_session_tokens(expires_at);

-- RLS policies
ALTER TABLE public.student_session_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage session tokens" ON public.student_session_tokens
  FOR ALL USING (is_main_admin()) WITH CHECK (is_main_admin());

CREATE POLICY "Public can insert session tokens" ON public.student_session_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view own session tokens" ON public.student_session_tokens
  FOR SELECT USING (true);

-- Função para criar token de sessão
CREATE OR REPLACE FUNCTION public.create_session_token(
  p_student_email TEXT,
  p_student_name TEXT,
  p_turma TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_token UUID;
  existing_token_record RECORD;
BEGIN
  -- Normalizar email
  p_student_email := LOWER(TRIM(p_student_email));
  
  -- Verificar se já existe um token ativo válido
  SELECT * INTO existing_token_record
  FROM public.student_session_tokens
  WHERE student_email = p_student_email
    AND is_active = true
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Se já existe token válido, retornar ele
  IF existing_token_record.token IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'token', existing_token_record.token,
      'expires_at', existing_token_record.expires_at,
      'message', 'Token existente válido'
    );
  END IF;
  
  -- Desativar tokens antigos deste aluno
  UPDATE public.student_session_tokens
  SET is_active = false
  WHERE student_email = p_student_email;
  
  -- Criar novo token
  INSERT INTO public.student_session_tokens (
    student_email,
    student_name,
    turma,
    expires_at
  ) VALUES (
    p_student_email,
    TRIM(p_student_name),
    TRIM(p_turma),
    now() + INTERVAL '24 hours'
  ) RETURNING token INTO new_token;
  
  RETURN jsonb_build_object(
    'success', true,
    'token', new_token,
    'expires_at', now() + INTERVAL '24 hours',
    'message', 'Novo token criado'
  );
END;
$$;

-- Função para registrar presença usando token
CREATE OR REPLACE FUNCTION public.registrar_entrada_com_token(
  p_aula_id UUID,
  p_session_token UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  token_record RECORD;
  aula_record RECORD;
  existing_record RECORD;
  aula_inicio TIMESTAMP WITH TIME ZONE;
  aula_fim TIMESTAMP WITH TIME ZONE;
  now_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Validar token de sessão
  SELECT * INTO token_record
  FROM public.student_session_tokens
  WHERE token = p_session_token
    AND is_active = true
    AND expires_at > now_time;
  
  IF token_record.token IS NULL THEN
    RETURN 'token_invalido_ou_expirado';
  END IF;
  
  -- Buscar informações da aula virtual
  SELECT * INTO aula_record
  FROM public.aulas_virtuais
  WHERE id = p_aula_id AND ativo = true;
  
  IF aula_record.id IS NULL THEN
    RETURN 'aula_nao_encontrada';
  END IF;
  
  -- Calcular horários da aula
  aula_inicio := (aula_record.data_aula || ' ' || aula_record.horario_inicio)::TIMESTAMP WITH TIME ZONE;
  aula_fim := (aula_record.data_aula || ' ' || aula_record.horario_fim)::TIMESTAMP WITH TIME ZONE;
  
  -- Validar janela de tempo (10min antes até 30min depois do fim)
  IF now_time < (aula_inicio - INTERVAL '10 minutes') THEN
    RETURN 'aula_nao_iniciou';
  END IF;
  
  IF now_time > (aula_fim + INTERVAL '30 minutes') THEN
    RETURN 'janela_encerrada';
  END IF;
  
  -- Verificar se já existe registro de entrada
  SELECT * INTO existing_record
  FROM public.presenca_aulas
  WHERE aula_id = p_aula_id
    AND email_aluno = token_record.student_email
    AND entrada_at IS NOT NULL;
  
  IF existing_record.id IS NOT NULL THEN
    RETURN 'entrada_ja_registrada';
  END IF;
  
  -- Registrar entrada
  INSERT INTO public.presenca_aulas (
    aula_id,
    email_aluno,
    nome_aluno,
    turma,
    tipo_registro,
    entrada_at
  ) VALUES (
    p_aula_id,
    token_record.student_email,
    token_record.student_name,
    token_record.turma,
    'entrada',
    now_time
  )
  ON CONFLICT (aula_id, email_aluno) 
  DO UPDATE SET
    entrada_at = now_time,
    tipo_registro = 'entrada',
    atualizado_em = now_time;
  
  RETURN 'entrada_ok';
END;
$$;

-- Função para registrar saída usando token
CREATE OR REPLACE FUNCTION public.registrar_saida_com_token(
  p_aula_id UUID,
  p_session_token UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  token_record RECORD;
  aula_record RECORD;
  existing_record RECORD;
  aula_inicio TIMESTAMP WITH TIME ZONE;
  aula_fim TIMESTAMP WITH TIME ZONE;
  now_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Validar token de sessão
  SELECT * INTO token_record
  FROM public.student_session_tokens
  WHERE token = p_session_token
    AND is_active = true
    AND expires_at > now_time;
  
  IF token_record.token IS NULL THEN
    RETURN 'token_invalido_ou_expirado';
  END IF;
  
  -- Buscar informações da aula virtual
  SELECT * INTO aula_record
  FROM public.aulas_virtuais
  WHERE id = p_aula_id AND ativo = true;
  
  IF aula_record.id IS NULL THEN
    RETURN 'aula_nao_encontrada';
  END IF;
  
  -- Calcular horários da aula
  aula_inicio := (aula_record.data_aula || ' ' || aula_record.horario_inicio)::TIMESTAMP WITH TIME ZONE;
  aula_fim := (aula_record.data_aula || ' ' || aula_record.horario_fim)::TIMESTAMP WITH TIME ZONE;
  
  -- Validar janela de tempo (só depois do início até 30min depois do fim)
  IF now_time < aula_inicio THEN
    RETURN 'aula_nao_iniciou';
  END IF;
  
  IF now_time > (aula_fim + INTERVAL '30 minutes') THEN
    RETURN 'janela_encerrada';
  END IF;
  
  -- Verificar se existe registro de entrada
  SELECT * INTO existing_record
  FROM public.presenca_aulas
  WHERE aula_id = p_aula_id
    AND email_aluno = token_record.student_email;
  
  IF existing_record.id IS NULL OR existing_record.entrada_at IS NULL THEN
    RETURN 'precisa_entrada';
  END IF;
  
  -- Verificar se saída já foi registrada
  IF existing_record.saida_at IS NOT NULL THEN
    RETURN 'saida_ja_registrada';
  END IF;
  
  -- Registrar saída
  UPDATE public.presenca_aulas
  SET
    saida_at = now_time,
    tipo_registro = 'saida',
    atualizado_em = now_time
  WHERE id = existing_record.id;
  
  RETURN 'saida_ok';
END;
$$;

-- Função para limpar tokens expirados (manutenção)
CREATE OR REPLACE FUNCTION public.limpar_tokens_expirados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.student_session_tokens
  SET is_active = false
  WHERE expires_at <= now() AND is_active = true;
END;
$$;