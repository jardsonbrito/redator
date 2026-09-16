-- Adiciona coluna de valor monetário por interação na configuração do Jarvis
ALTER TABLE jarvis_config
ADD COLUMN IF NOT EXISTS valor_por_interacao DECIMAL(10,2) DEFAULT NULL;

COMMENT ON COLUMN jarvis_config.valor_por_interacao IS
  'Valor em reais exibido ao aluno por interação com o Jarvis (opcional). Ex: 0.35';
