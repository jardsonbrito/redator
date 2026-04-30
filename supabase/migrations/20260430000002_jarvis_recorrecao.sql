-- Versionamento de correções para suporte à recorreção auditável
-- grupo_id agrupa todas as versões da mesma redação
-- numero_versao incrementa a cada recorreção
-- is_versao_principal marca qual versão é a "oficial" atual

ALTER TABLE jarvis_correcoes
  ADD COLUMN IF NOT EXISTS grupo_id UUID,
  ADD COLUMN IF NOT EXISTS numero_versao INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_versao_principal BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tipo_correcao TEXT NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS motivo_recorrecao TEXT,
  ADD COLUMN IF NOT EXISTS solicitada_por TEXT;

-- Backfill: todo registro existente inicia com grupo_id = id
UPDATE jarvis_correcoes
SET grupo_id = id
WHERE grupo_id IS NULL;

-- Torna grupo_id obrigatório após backfill
ALTER TABLE jarvis_correcoes
  ALTER COLUMN grupo_id SET NOT NULL;

-- Índices para performance nas queries de versionamento
CREATE INDEX IF NOT EXISTS idx_jarvis_correcoes_grupo_id
  ON jarvis_correcoes(grupo_id);

CREATE INDEX IF NOT EXISTS idx_jarvis_correcoes_principal
  ON jarvis_correcoes(grupo_id, is_versao_principal);
