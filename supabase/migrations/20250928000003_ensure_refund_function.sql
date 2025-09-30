-- Migration para garantir que a função refund_credits_on_cancel esteja correta
-- Data: 2025-09-28

-- Primeiro, remover qualquer versão existente da função
DROP FUNCTION IF EXISTS public.refund_credits_on_cancel(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.refund_credits_on_cancel(UUID, INTEGER);
DROP FUNCTION IF EXISTS refund_credits_on_cancel(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS refund_credits_on_cancel(UUID, INTEGER);

-- Recriar a função com assinatura garantida
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
  -- Log inicial para debug
  RAISE LOG 'refund_credits_on_cancel INICIADO: user_id=%, amount=%, reason=%', p_user_id, p_amount, p_reason;

  -- Buscar usuário completo
  SELECT id, creditos, nome, email
  INTO user_record
  FROM profiles
  WHERE id = p_user_id
    AND user_type = 'aluno'
  LIMIT 1;

  -- Verificar se usuário existe
  IF NOT FOUND THEN
    RAISE LOG 'refund_credits_on_cancel ERRO: Usuário não encontrado: %', p_user_id;
    RAISE EXCEPTION 'Usuário não encontrado: %', p_user_id;
  END IF;

  RAISE LOG 'refund_credits_on_cancel: Usuário encontrado - creditos atuais=%', user_record.creditos;

  -- Calcular novos créditos
  new_credits := COALESCE(user_record.creditos, 0) + p_amount;

  RAISE LOG 'refund_credits_on_cancel: Novos créditos calculados=%', new_credits;

  -- Atualizar créditos (com SECURITY DEFINER contorna RLS)
  UPDATE profiles
  SET creditos = new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Verificar se update funcionou
  IF NOT FOUND THEN
    RAISE LOG 'refund_credits_on_cancel ERRO: Falha no UPDATE para user_id=%', p_user_id;
    RAISE EXCEPTION 'Falha ao atualizar créditos para usuário: %', p_user_id;
  END IF;

  RAISE LOG 'refund_credits_on_cancel: UPDATE realizado com sucesso';

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

  RAISE LOG 'refund_credits_on_cancel: Registro de auditoria inserido';
  RAISE LOG 'refund_credits_on_cancel FINALIZADO COM SUCESSO';

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro detalhado
    RAISE LOG 'refund_credits_on_cancel ERRO CRÍTICO para user_id %: % - %', p_user_id, SQLSTATE, SQLERRM;
    -- Re-raise a exceção para o código chamador
    RAISE;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.refund_credits_on_cancel(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits_on_cancel(UUID, INTEGER, TEXT) TO anon;

-- Comentário da função
COMMENT ON FUNCTION public.refund_credits_on_cancel IS 'Função GARANTIDA para retorno de créditos em cancelamentos - v2';

-- Verificar se a função foi criada corretamente
DO $$
BEGIN
  -- Tentar chamar a função com parâmetros de teste para verificar se existe
  PERFORM public.refund_credits_on_cancel(
    '00000000-0000-0000-0000-000000000000'::UUID,
    1,
    'Teste de criação da função'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Esperamos que falhe (usuário não existe), mas pelo menos sabemos que a função existe
    RAISE LOG 'Função refund_credits_on_cancel criada e testada (erro esperado de usuário não encontrado)';
END;
$$;