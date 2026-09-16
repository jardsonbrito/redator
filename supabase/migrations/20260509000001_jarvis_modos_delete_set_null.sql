-- Permite deletar modos mesmo com histórico de interações.
-- O histórico é preservado com modo_id = NULL em vez de bloquear a deleção.
ALTER TABLE jarvis_interactions
  DROP CONSTRAINT IF EXISTS jarvis_interactions_modo_id_fkey;

ALTER TABLE jarvis_interactions
  ADD CONSTRAINT jarvis_interactions_modo_id_fkey
    FOREIGN KEY (modo_id)
    REFERENCES jarvis_modos(id)
    ON DELETE SET NULL;
