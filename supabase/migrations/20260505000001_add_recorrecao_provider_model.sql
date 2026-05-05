-- Adiciona configuração de provider/modelo para recorreções (2ª, 3ª...)
ALTER TABLE jarvis_correcao_config
  ADD COLUMN IF NOT EXISTS recorrecao_provider TEXT NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS recorrecao_model    TEXT NOT NULL DEFAULT 'gemini-pro-latest';

COMMENT ON COLUMN jarvis_correcao_config.recorrecao_provider IS
  'Provider usado nas recorreções (2ª, 3ª...). Independente do provider da 1ª correção.';
COMMENT ON COLUMN jarvis_correcao_config.recorrecao_model IS
  'Modelo usado nas recorreções (2ª, 3ª...).';
