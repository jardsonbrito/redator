-- Armazena prompts customizados do Pipeline V5 por competência
ALTER TABLE jarvis_correcao_config
  ADD COLUMN IF NOT EXISTS pipeline_v5_prompts JSONB DEFAULT NULL;

COMMENT ON COLUMN jarvis_correcao_config.pipeline_v5_prompts IS
  'Prompts customizados do Pipeline V5: { c1, c2, c3, c4, c5, consolidacao } x { system, user_template }. NULL = usa defaults hardcoded da edge function.';
