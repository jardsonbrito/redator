-- Trigger BEFORE INSERT que auto-preenche grupo_id = id quando não fornecido.
-- Necessário porque jarvis-correcao-enviar insere sem grupo_id (definido só no processar).
CREATE OR REPLACE FUNCTION fn_jarvis_grupo_id_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.grupo_id IS NULL THEN
    NEW.grupo_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jarvis_grupo_id_default
BEFORE INSERT ON jarvis_correcoes
FOR EACH ROW
EXECUTE FUNCTION fn_jarvis_grupo_id_default();
