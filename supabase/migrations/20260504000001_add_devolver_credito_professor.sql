-- Função para devolver créditos ao professor em caso de falha na correção
CREATE OR REPLACE FUNCTION devolver_credito_professor(
  professor_id_param UUID,
  quantidade INTEGER DEFAULT 1,
  motivo TEXT DEFAULT 'Correção falhou — crédito devolvido automaticamente'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  professor_record RECORD;
  new_credits INTEGER;
BEGIN
  IF quantidade <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade deve ser maior que zero');
  END IF;

  SELECT id, jarvis_correcao_creditos
  INTO professor_record
  FROM professores
  WHERE id = professor_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Professor não encontrado');
  END IF;

  new_credits := COALESCE(professor_record.jarvis_correcao_creditos, 0) + quantidade;

  UPDATE professores
  SET jarvis_correcao_creditos = new_credits,
      atualizado_em = NOW()
  WHERE id = professor_id_param;

  INSERT INTO jarvis_correcao_credit_audit (
    professor_id,
    admin_id,
    old_credits,
    new_credits,
    amount,
    action,
    description,
    reason
  ) VALUES (
    professor_id_param,
    NULL,
    COALESCE(professor_record.jarvis_correcao_creditos, 0),
    new_credits,
    quantidade,
    'add',
    'Devolução de ' || quantidade || ' crédito(s) por falha na correção',
    motivo
  );

  RETURN jsonb_build_object(
    'success', true,
    'creditos_anteriores', COALESCE(professor_record.jarvis_correcao_creditos, 0),
    'creditos_atuais', new_credits,
    'quantidade_devolvida', quantidade
  );
END;
$$;

COMMENT ON FUNCTION devolver_credito_professor IS
  'Devolve créditos ao professor quando uma correção falha. Registra em audit.';
