-- Tabela de log de créditos (auditoria)
CREATE TABLE IF NOT EXISTS jarvis_creditos_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admin_users(id),
  quantidade INTEGER NOT NULL,
  observacao TEXT,
  saldo_anterior INTEGER NOT NULL,
  saldo_posterior INTEGER NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE jarvis_creditos_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jarvis_creditos_log' AND policyname = 'Admins gerenciam log de créditos'
  ) THEN
    CREATE POLICY "Admins gerenciam log de créditos"
      ON jarvis_creditos_log FOR ALL
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Recriar a função com assinatura e retorno corretos
DROP FUNCTION IF EXISTS adicionar_creditos_professor(UUID, INTEGER, UUID, TEXT);

CREATE FUNCTION adicionar_creditos_professor(
  p_professor_id UUID,
  p_quantidade INTEGER,
  p_admin_id UUID,
  p_observacao TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo_anterior INTEGER;
  v_saldo_posterior INTEGER;
BEGIN
  SELECT COALESCE(jarvis_correcao_creditos, 0)
  INTO v_saldo_anterior
  FROM professores
  WHERE id = p_professor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Professor não encontrado';
  END IF;

  v_saldo_posterior := GREATEST(0, v_saldo_anterior + p_quantidade);

  UPDATE professores
  SET jarvis_correcao_creditos = v_saldo_posterior
  WHERE id = p_professor_id;

  INSERT INTO jarvis_creditos_log (professor_id, admin_id, quantidade, observacao, saldo_anterior, saldo_posterior)
  VALUES (p_professor_id, p_admin_id, p_quantidade, p_observacao, v_saldo_anterior, v_saldo_posterior);

  RETURN v_saldo_posterior;
END;
$$;
