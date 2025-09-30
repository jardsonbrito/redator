-- Migration para corrigir funções de créditos com schema consistente
-- Data: 2025-09-28

-- 1. Função para consumir créditos (corrigida)
CREATE OR REPLACE FUNCTION public.consume_credit_safe(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do criador da função
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  new_credits INTEGER;
BEGIN
  -- Buscar usuário
  SELECT id, creditos, nome, email
  INTO user_record
  FROM profiles
  WHERE id = target_user_id
    AND user_type = 'aluno'
  LIMIT 1;

  -- Verificar se usuário existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', target_user_id;
  END IF;

  -- Verificar créditos suficientes
  IF COALESCE(user_record.creditos, 0) < 1 THEN
    RAISE EXCEPTION 'Créditos insuficientes: atual=%, necessário=1', user_record.creditos;
  END IF;

  -- Calcular novos créditos
  new_credits := COALESCE(user_record.creditos, 0) - 1;

  -- Atualizar créditos (com SECURITY DEFINER contorna RLS)
  UPDATE profiles
  SET creditos = new_credits,
      updated_at = NOW()
  WHERE id = target_user_id;

  -- Verificar se update funcionou
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar créditos para usuário: %', target_user_id;
  END IF;

  -- Log da operação na credit_audit
  INSERT INTO credit_audit (
    user_id,
    admin_id,
    old_credits,
    new_credits,
    amount,
    action,
    description,
    reason,
    created_at
  ) VALUES (
    target_user_id,
    NULL,
    COALESCE(user_record.creditos, 0),
    new_credits,
    1,
    'subtract',
    'Consumo de 1 crédito para envio de redação',
    'Envio de redação',
    NOW()
  );

  -- Retornar novos créditos
  RETURN new_credits;

EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro
    RAISE LOG 'Erro em consume_credit_safe: %', SQLERRM;
    -- Re-raise a exceção para o código chamador
    RAISE;
END;
$$;

-- 2. Função para adicionar créditos (corrigida)
CREATE OR REPLACE FUNCTION public.add_credits_safe(
  target_user_id UUID,
  credit_amount INTEGER,
  admin_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  new_credits INTEGER;
BEGIN
  -- Buscar usuário
  SELECT id, creditos, nome, email
  INTO user_record
  FROM profiles
  WHERE id = target_user_id
    AND user_type = 'aluno'
  LIMIT 1;

  -- Verificar se usuário existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', target_user_id;
  END IF;

  -- Calcular novos créditos
  new_credits := COALESCE(user_record.creditos, 0) + credit_amount;

  -- Atualizar créditos
  UPDATE profiles
  SET creditos = new_credits,
      updated_at = NOW()
  WHERE id = target_user_id;

  -- Verificar se update funcionou
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar créditos para usuário: %', target_user_id;
  END IF;

  -- Log da operação na credit_audit
  INSERT INTO credit_audit (
    user_id,
    admin_id,
    old_credits,
    new_credits,
    amount,
    action,
    description,
    reason,
    created_at
  ) VALUES (
    target_user_id,
    admin_user_id,
    COALESCE(user_record.creditos, 0),
    new_credits,
    credit_amount,
    'add',
    format('Adição de %s crédito(s)', credit_amount),
    'Ressarcimento de créditos',
    NOW()
  );

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro em add_credits_safe: %', SQLERRM;
    RETURN false;
END;
$$;

-- 3. Função para refund específico (melhorada)
CREATE OR REPLACE FUNCTION public.refund_credits_on_cancel(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'Cancelamento de redação'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  new_credits INTEGER;
BEGIN
  -- Buscar usuário
  SELECT id, creditos, nome, email
  INTO user_record
  FROM profiles
  WHERE id = p_user_id
    AND user_type = 'aluno'
  LIMIT 1;

  -- Verificar se usuário existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', p_user_id;
  END IF;

  -- Calcular novos créditos
  new_credits := COALESCE(user_record.creditos, 0) + p_amount;

  -- Atualizar créditos
  UPDATE profiles
  SET creditos = new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Verificar se update funcionou
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar créditos para usuário: %', p_user_id;
  END IF;

  -- Log da operação na credit_audit
  INSERT INTO credit_audit (
    user_id,
    admin_id,
    old_credits,
    new_credits,
    amount,
    action,
    description,
    reason,
    created_at
  ) VALUES (
    p_user_id,
    NULL,
    COALESCE(user_record.creditos, 0),
    new_credits,
    p_amount,
    'add',
    format('Retorno de %s crédito(s) por cancelamento', p_amount),
    p_reason,
    NOW()
  );

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro em refund_credits_on_cancel: %', SQLERRM;
    RETURN false;
END;
$$;

-- Dar permissões para usar as funções
GRANT EXECUTE ON FUNCTION consume_credit_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_credits_safe(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_credits_on_cancel(UUID, INTEGER, TEXT) TO authenticated;

-- Comentários das funções
COMMENT ON FUNCTION consume_credit_safe IS 'Função segura para consumir 1 crédito de um usuário';
COMMENT ON FUNCTION add_credits_safe IS 'Função segura para adicionar créditos a um usuário';
COMMENT ON FUNCTION refund_credits_on_cancel IS 'Função específica para retorno de créditos em cancelamentos';