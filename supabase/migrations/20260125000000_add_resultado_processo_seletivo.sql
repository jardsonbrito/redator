-- =====================================================
-- MIGRAÇÃO: Sistema de Resultados do Processo Seletivo
-- Data: 2026-01-25
-- Descrição: Adiciona sistema de divulgação de resultados
-- =====================================================

-- 1. Adicionar campo para controle de inscrições (separado de ativo)
ALTER TABLE ps_formularios
ADD COLUMN IF NOT EXISTS inscricoes_abertas BOOLEAN DEFAULT true;

-- Atualizar formulários existentes para manter inscricoes_abertas = ativo
UPDATE ps_formularios
SET inscricoes_abertas = ativo
WHERE inscricoes_abertas IS NULL;

-- 2. Criar tabela de configuração de resultados
CREATE TABLE IF NOT EXISTS ps_resultado_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID REFERENCES ps_formularios(id) ON DELETE CASCADE,
  -- Configurações de bolsas (array de objetos JSON)
  -- Exemplo: [{"nome": "Bolsa 100%", "percentual": 100, "vagas": 5}, {"nome": "Bolsa 40%", "percentual": 40, "vagas": 10}]
  bolsas JSONB DEFAULT '[]',
  resultado_publicado BOOLEAN DEFAULT false,
  data_publicacao TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(formulario_id)
);

-- 3. Adicionar campos de resultado em ps_candidatos
ALTER TABLE ps_candidatos
ADD COLUMN IF NOT EXISTS mensagem_resultado TEXT,
ADD COLUMN IF NOT EXISTS bolsa_conquistada TEXT,
ADD COLUMN IF NOT EXISTS percentual_bolsa INTEGER,
ADD COLUMN IF NOT EXISTS classificacao INTEGER;

-- 4. Habilitar RLS para a nova tabela
ALTER TABLE ps_resultado_config ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de segurança para ps_resultado_config
CREATE POLICY "Admins podem gerenciar configurações de resultado"
ON ps_resultado_config
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Função para calcular ranking do processo seletivo
CREATE OR REPLACE FUNCTION calcular_ranking_processo_seletivo(p_formulario_id UUID)
RETURNS TABLE (
  candidato_id UUID,
  nome_aluno TEXT,
  email_aluno TEXT,
  nota_total INTEGER,
  classificacao INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH notas AS (
    SELECT
      c.id as candidato_id,
      c.nome_aluno,
      c.email_aluno,
      COALESCE(r.nota_total, 0) as nota_total
    FROM ps_candidatos c
    LEFT JOIN redacoes_enviadas r ON r.processo_seletivo_candidato_id = c.id
      AND r.deleted_at IS NULL
      AND r.status_corretor_1 = 'corrigida'
    WHERE c.formulario_id = p_formulario_id
      AND c.status = 'concluido'
  )
  SELECT
    n.candidato_id,
    n.nome_aluno,
    n.email_aluno,
    n.nota_total::INTEGER,
    DENSE_RANK() OVER (ORDER BY n.nota_total DESC)::INTEGER as classificacao
  FROM notas n
  ORDER BY classificacao, n.nome_aluno;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_ps_resultado_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ps_resultado_config_timestamp ON ps_resultado_config;
CREATE TRIGGER update_ps_resultado_config_timestamp
  BEFORE UPDATE ON ps_resultado_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ps_resultado_config_timestamp();
