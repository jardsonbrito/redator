-- Função para remover créditos Jarvis
CREATE OR REPLACE FUNCTION remove_jarvis_credits(
  target_user_id UUID,
  credit_amount INTEGER,
  admin_user_id UUID,
  reason_text TEXT DEFAULT 'Remoção manual de créditos'
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
  -- Validar quantidade
  IF credit_amount <= 0 THEN
    RAISE EXCEPTION 'Quantidade de créditos deve ser positiva';
  END IF;

  -- Buscar usuário
  SELECT id, jarvis_creditos, nome, email
  INTO user_record
  FROM profiles
  WHERE id = target_user_id
    AND user_type = 'aluno'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', target_user_id;
  END IF;

  -- Calcular novos créditos (mínimo 0)
  new_credits := GREATEST(0, COALESCE(user_record.jarvis_creditos, 0) - credit_amount);

  -- Atualizar
  UPDATE profiles
  SET jarvis_creditos = new_credits,
      updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar créditos Jarvis';
  END IF;

  -- Auditoria
  INSERT INTO jarvis_credit_audit (
    user_id,
    admin_id,
    old_credits,
    new_credits,
    amount,
    action,
    description,
    reason
  ) VALUES (
    target_user_id,
    admin_user_id,
    COALESCE(user_record.jarvis_creditos, 0),
    new_credits,
    credit_amount,
    'remove',
    format('Remoção de %s crédito(s) Jarvis por admin', credit_amount),
    reason_text
  );

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro em remove_jarvis_credits: %', SQLERRM;
    RETURN false;
END;
$$;
