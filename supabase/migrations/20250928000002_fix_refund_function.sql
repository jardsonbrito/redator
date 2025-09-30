-- Migration para corrigir função refund_credits_on_cancel com schema correto
-- Data: 2025-09-28

-- Substituir função existente com schema correto da credit_audit
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
  -- Buscar usuário completo
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

  -- Atualizar créditos (com SECURITY DEFINER contorna RLS)
  UPDATE profiles
  SET creditos = new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Verificar se update funcionou
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar créditos para usuário: %', p_user_id;
  END IF;

  -- Log da operação na credit_audit com schema correto
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
    -- Log do erro detalhado
    RAISE LOG 'Erro em refund_credits_on_cancel para user_id %: %', p_user_id, SQLERRM;
    -- Re-raise a exceção para o código chamador
    RAISE;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION refund_credits_on_cancel(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_credits_on_cancel(UUID, INTEGER, TEXT) TO anon;

-- Comentário da função
COMMENT ON FUNCTION refund_credits_on_cancel IS 'Função corrigida para retorno de créditos em cancelamentos';