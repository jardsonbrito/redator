-- Add aula_id and acao to inbox_messages for automatic absence notifications
ALTER TABLE inbox_messages
  ADD COLUMN IF NOT EXISTS aula_id UUID,
  ADD COLUMN IF NOT EXISTS acao TEXT;
