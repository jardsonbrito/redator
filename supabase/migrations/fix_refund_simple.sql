-- Correção simples da função refund_credits_on_cancel
-- Execute este arquivo no Supabase SQL Editor

-- Remover função existente
DROP FUNCTION IF EXISTS public.refund_credits_on_cancel(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.refund_credits_on_cancel(UUID, INTEGER);

-- Recriar função com schema correto da credit_audit
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
  affected_rows INTEGER;
BEGIN
  -- Log inicial para debug
  RAISE LOG 'refund_credits_on_cancel INICIADO: user_id=%, amount=%', p_user_id, p_amount;

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

  RAISE LOG 'refund_credits_on_cancel: Novos créditos calculados=% (% + %)', new_credits, user_record.creditos, p_amount;

  -- CRITICAL: Atualizar créditos (com SECURITY DEFINER contorna RLS)
  UPDATE profiles
  SET creditos = new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Verificar se update funcionou
  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  IF affected_rows = 0 THEN
    RAISE LOG 'refund_credits_on_cancel ERRO: UPDATE não afetou nenhuma linha para user_id=%', p_user_id;
    RAISE EXCEPTION 'Falha ao atualizar créditos para usuário: %', p_user_id;
  END IF;

  RAISE LOG 'refund_credits_on_cancel: UPDATE realizado com sucesso (% linhas afetadas)', affected_rows;

  -- Inserir na credit_audit com schema REAL: id, user_id, admin_id, action, old_credits, new_credits, created_at
  INSERT INTO credit_audit (
    user_id,
    admin_id,
    action,
    old_credits,
    new_credits,
    created_at
  ) VALUES (
    p_user_id,
    NULL,  -- admin_id é NULL para operações automáticas
    'refund',  -- action específico para ressarcimento
    COALESCE(user_record.creditos, 0),
    new_credits,
    NOW()
  );

  RAISE LOG 'refund_credits_on_cancel: Registro de auditoria inserido com action=refund';
  RAISE LOG 'refund_credits_on_cancel FINALIZADO COM SUCESSO: % → %', user_record.creditos, new_credits;

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
COMMENT ON FUNCTION public.refund_credits_on_cancel IS 'Função para retorno de créditos - SCHEMA REAL da credit_audit';