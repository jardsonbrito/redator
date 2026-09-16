-- ═══════════════════════════════════════════════════════════════
-- JARVIS - SISTEMA DE CORREÇÃO INTELIGENTE COM IA
-- Migration: 20260425000000
-- Descrição: Sistema completo de correção de redações para professores (B2B)
--            com prompts 100% dinâmicos e versionados
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. SISTEMA DE CRÉDITOS PARA PROFESSORES
-- ─────────────────────────────────────────────────────────────────

-- Adicionar coluna de créditos na tabela professores
ALTER TABLE professores
ADD COLUMN IF NOT EXISTS jarvis_correcao_creditos INTEGER NOT NULL DEFAULT 0
CHECK (jarvis_correcao_creditos >= 0);

CREATE INDEX IF NOT EXISTS idx_professores_creditos
  ON professores(jarvis_correcao_creditos);

COMMENT ON COLUMN professores.jarvis_correcao_creditos IS
  'Créditos exclusivos para correção de redações com IA (independente de outros sistemas)';

-- Tabela de auditoria de créditos (professores)
CREATE TABLE IF NOT EXISTS jarvis_correcao_credit_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  old_credits INTEGER NOT NULL,
  new_credits INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('add', 'subtract', 'set')),
  reason TEXT,
  description TEXT,
  correcao_id UUID, -- FK adicionada depois
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_correcao_audit_professor ON jarvis_correcao_credit_audit(professor_id, created_at DESC);
CREATE INDEX idx_correcao_audit_admin ON jarvis_correcao_credit_audit(admin_id);
CREATE INDEX idx_correcao_audit_action ON jarvis_correcao_credit_audit(action);

ALTER TABLE jarvis_correcao_credit_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professores veem seu histórico de créditos"
  ON jarvis_correcao_credit_audit FOR SELECT
  USING (professor_id = auth.uid());

CREATE POLICY "Admins veem todo histórico de créditos"
  ON jarvis_correcao_credit_audit FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

COMMENT ON TABLE jarvis_correcao_credit_audit IS
  'Auditoria de créditos de correção - rastreabilidade completa';

-- ─────────────────────────────────────────────────────────────────
-- 2. RELAÇÃO N:N PROFESSOR-TURMAS
-- ─────────────────────────────────────────────────────────────────

-- Adicionar campo escola em turmas_professores (opcional)
ALTER TABLE turmas_professores
ADD COLUMN IF NOT EXISTS escola TEXT;

COMMENT ON COLUMN turmas_professores.escola IS
  'Nome da escola/instituição (opcional)';

-- Tabela de associação professor-turma (N:N)
CREATE TABLE IF NOT EXISTS professor_turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas_professores(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(professor_id, turma_id)
);

CREATE INDEX idx_professor_turmas_professor ON professor_turmas(professor_id);
CREATE INDEX idx_professor_turmas_turma ON professor_turmas(turma_id);

ALTER TABLE professor_turmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professores veem suas associações"
  ON professor_turmas FOR SELECT
  USING (professor_id = auth.uid());

CREATE POLICY "Admins gerenciam associações"
  ON professor_turmas FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

COMMENT ON TABLE professor_turmas IS
  'Relação N:N entre professores e turmas - um professor pode ter várias turmas';

-- ─────────────────────────────────────────────────────────────────
-- 3. CONFIGURAÇÃO VERSIONADA (FONTE ÚNICA DE VERDADE)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE jarvis_correcao_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Versionamento obrigatório
  versao INTEGER NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT false,
  nome TEXT NOT NULL,
  descricao TEXT,

  -- Configuração da IA
  provider TEXT NOT NULL DEFAULT 'openai' CHECK (provider IN ('openai', 'anthropic')),
  model TEXT NOT NULL,
  temperatura DECIMAL(3,2) NOT NULL CHECK (temperatura >= 0 AND temperatura <= 2),
  max_tokens INTEGER NOT NULL,

  -- Prompts (campos principais - 100% dinâmicos)
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,

  -- Schema JSON esperado (validação da resposta)
  response_schema JSONB NOT NULL,

  -- Custo e controle
  custo_creditos INTEGER NOT NULL DEFAULT 1 CHECK (custo_creditos > 0),
  custo_estimado_usd DECIMAL(6,4),

  -- Auditoria
  criado_por UUID REFERENCES admin_users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ativado_em TIMESTAMPTZ,
  ativado_por UUID REFERENCES admin_users(id),

  -- Metadata adicional
  notas TEXT -- Notas internas do admin sobre mudanças nesta versão
);

-- Índices
CREATE INDEX idx_jarvis_correcao_config_versao ON jarvis_correcao_config(versao DESC);
CREATE INDEX idx_jarvis_correcao_config_ativo ON jarvis_correcao_config(ativo) WHERE ativo = true;

-- Constraint: apenas UMA versão ativa por vez
CREATE UNIQUE INDEX idx_jarvis_correcao_config_ativo_unico
  ON jarvis_correcao_config(ativo)
  WHERE ativo = true;

-- RLS
ALTER TABLE jarvis_correcao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam configs"
  ON jarvis_correcao_config FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Todos leem config ativa"
  ON jarvis_correcao_config FOR SELECT
  USING (ativo = true);

-- Comentários
COMMENT ON TABLE jarvis_correcao_config IS
  'Configurações versionadas do sistema de correção - FONTE ÚNICA DE VERDADE. Prompts 100% dinâmicos.';
COMMENT ON COLUMN jarvis_correcao_config.system_prompt IS
  'Prompt do sistema - define comportamento da IA. Editável pelo admin sem deploy.';
COMMENT ON COLUMN jarvis_correcao_config.user_prompt_template IS
  'Template do prompt do usuário com variáveis {tema}, {texto}. Editável pelo admin.';
COMMENT ON COLUMN jarvis_correcao_config.response_schema IS
  'Schema JSON (JSON Schema) para validar resposta da IA';
COMMENT ON COLUMN jarvis_correcao_config.versao IS
  'Versão incremental. Apenas UMA versão pode estar ativa por vez.';

-- ─────────────────────────────────────────────────────────────────
-- 4. TABELA PRINCIPAL DE CORREÇÕES
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE jarvis_correcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  turma_id UUID REFERENCES turmas_professores(id) ON DELETE SET NULL,
  autor_nome TEXT NOT NULL,

  -- Dados da redação
  tema TEXT NOT NULL,
  imagem_url TEXT,
  transcricao_ocr_original TEXT,
  transcricao_confirmada TEXT,

  -- Status do fluxo
  status TEXT NOT NULL DEFAULT 'aguardando_ocr'
    CHECK (status IN ('aguardando_ocr', 'revisao_ocr', 'aguardando_correcao', 'corrigida', 'erro')),
  erro_mensagem TEXT, -- Se status = 'erro', armazena detalhes

  -- Rastreabilidade da config usada (OBRIGATÓRIO)
  config_id UUID REFERENCES jarvis_correcao_config(id),
  config_versao INTEGER,
  provider TEXT,
  modelo_ia TEXT,
  temperatura DECIMAL(3,2),
  max_tokens INTEGER,

  -- Snapshots dos prompts (imutáveis - para auditoria)
  prompt_system_usado TEXT,
  prompt_user_usado TEXT,

  -- Correção da IA (JSON estruturado)
  correcao_ia JSONB,

  -- Notas extraídas (denormalizadas para queries)
  nota_total INTEGER CHECK (nota_total >= 0 AND nota_total <= 1000),
  nota_c1 INTEGER CHECK (nota_c1 >= 0 AND nota_c1 <= 200),
  nota_c2 INTEGER CHECK (nota_c2 >= 0 AND nota_c2 <= 200),
  nota_c3 INTEGER CHECK (nota_c3 >= 0 AND nota_c3 <= 200),
  nota_c4 INTEGER CHECK (nota_c4 >= 0 AND nota_c4 <= 200),
  nota_c5 INTEGER CHECK (nota_c5 >= 0 AND nota_c5 <= 200),

  -- Metadados técnicos
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  tempo_processamento_ms INTEGER,
  custo_estimado DECIMAL(8,6),

  -- Timestamps
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  corrigida_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices otimizados
CREATE INDEX idx_jarvis_correcoes_professor ON jarvis_correcoes(professor_id, criado_em DESC);
CREATE INDEX idx_jarvis_correcoes_turma ON jarvis_correcoes(turma_id);
CREATE INDEX idx_jarvis_correcoes_status ON jarvis_correcoes(status);
CREATE INDEX idx_jarvis_correcoes_autor ON jarvis_correcoes(autor_nome);
CREATE INDEX idx_jarvis_correcoes_config ON jarvis_correcoes(config_id);
CREATE INDEX idx_jarvis_correcoes_versao ON jarvis_correcoes(config_versao);
CREATE INDEX idx_jarvis_correcoes_nota ON jarvis_correcoes(nota_total) WHERE nota_total IS NOT NULL;

-- RLS
ALTER TABLE jarvis_correcoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professores veem suas correções"
  ON jarvis_correcoes FOR SELECT
  USING (professor_id = auth.uid());

CREATE POLICY "Professores inserem suas correções"
  ON jarvis_correcoes FOR INSERT
  WITH CHECK (professor_id = auth.uid());

CREATE POLICY "Professores atualizam suas correções"
  ON jarvis_correcoes FOR UPDATE
  USING (professor_id = auth.uid());

CREATE POLICY "Admins veem todas correções"
  ON jarvis_correcoes FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Comentários
COMMENT ON TABLE jarvis_correcoes IS
  'Redações corrigidas com IA - cada registro rastreia config, prompts e custos usados';
COMMENT ON COLUMN jarvis_correcoes.prompt_system_usado IS
  'Snapshot imutável do system_prompt usado - permite auditoria mesmo após mudanças na config';
COMMENT ON COLUMN jarvis_correcoes.prompt_user_usado IS
  'Snapshot do prompt final montado - facilita debug e análise';
COMMENT ON COLUMN jarvis_correcoes.config_id IS
  'FK para config usada - permite análise de performance por versão';
COMMENT ON COLUMN jarvis_correcoes.correcao_ia IS
  'JSON estruturado com toda a correção: competências, erros, análise, versão lapidada';

-- Adicionar FK em credit_audit apontando para correções
ALTER TABLE jarvis_correcao_credit_audit
ADD CONSTRAINT fk_correcao_id
FOREIGN KEY (correcao_id) REFERENCES jarvis_correcoes(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────
-- 5. AUDITORIA DE MUDANÇAS DE CONFIGURAÇÃO
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE jarvis_correcao_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES jarvis_correcao_config(id) ON DELETE CASCADE,
  acao TEXT NOT NULL CHECK (acao IN ('criada', 'ativada', 'desativada', 'editada', 'duplicada')),
  admin_id UUID REFERENCES admin_users(id),
  mudancas JSONB, -- Diff das mudanças (se editada/duplicada)
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_config_audit_config ON jarvis_correcao_config_audit(config_id, criado_em DESC);
CREATE INDEX idx_config_audit_admin ON jarvis_correcao_config_audit(admin_id);
CREATE INDEX idx_config_audit_acao ON jarvis_correcao_config_audit(acao);

ALTER TABLE jarvis_correcao_config_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem audit de configs"
  ON jarvis_correcao_config_audit FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

COMMENT ON TABLE jarvis_correcao_config_audit IS
  'Histórico de mudanças em configurações - rastreabilidade completa de quem fez o quê';

-- ─────────────────────────────────────────────────────────────────
-- 6. VIEWS DE ANÁLISE
-- ─────────────────────────────────────────────────────────────────

-- View para análise de performance por configuração
CREATE OR REPLACE VIEW v_analise_config_correcao AS
SELECT
  c.config_id,
  cfg.versao,
  cfg.nome as config_nome,
  cfg.model,
  cfg.temperatura,
  COUNT(*) as total_correcoes,
  AVG(c.nota_total)::DECIMAL(5,2) as media_nota,
  STDDEV(c.nota_total)::DECIMAL(5,2) as desvio_nota,
  AVG(c.nota_c1)::DECIMAL(5,2) as media_c1,
  AVG(c.nota_c2)::DECIMAL(5,2) as media_c2,
  AVG(c.nota_c3)::DECIMAL(5,2) as media_c3,
  AVG(c.nota_c4)::DECIMAL(5,2) as media_c4,
  AVG(c.nota_c5)::DECIMAL(5,2) as media_c5,
  AVG(c.tokens_total)::INTEGER as media_tokens,
  SUM(c.tokens_total) as total_tokens,
  SUM(c.custo_estimado)::DECIMAL(10,2) as custo_total_usd,
  MIN(c.criado_em) as primeira_correcao,
  MAX(c.criado_em) as ultima_correcao
FROM jarvis_correcoes c
JOIN jarvis_correcao_config cfg ON c.config_id = cfg.id
WHERE c.status = 'corrigida'
GROUP BY c.config_id, cfg.versao, cfg.nome, cfg.model, cfg.temperatura
ORDER BY cfg.versao DESC;

COMMENT ON VIEW v_analise_config_correcao IS
  'Análise de performance por versão de configuração - útil para calibração e comparação';

-- View de métricas por turma
CREATE OR REPLACE VIEW v_metricas_turma AS
SELECT
  t.id as turma_id,
  t.nome as turma_nome,
  t.escola,
  COUNT(*) as total_correcoes,
  COUNT(DISTINCT c.autor_nome) as total_alunos,
  AVG(c.nota_total)::DECIMAL(5,2) as media_geral,
  AVG(c.nota_c1)::DECIMAL(5,2) as media_c1,
  AVG(c.nota_c2)::DECIMAL(5,2) as media_c2,
  AVG(c.nota_c3)::DECIMAL(5,2) as media_c3,
  AVG(c.nota_c4)::DECIMAL(5,2) as media_c4,
  AVG(c.nota_c5)::DECIMAL(5,2) as media_c5,
  MIN(c.nota_total) as nota_minima,
  MAX(c.nota_total) as nota_maxima
FROM turmas_professores t
JOIN jarvis_correcoes c ON c.turma_id = t.id
WHERE c.status = 'corrigida'
GROUP BY t.id, t.nome, t.escola
ORDER BY media_geral DESC;

COMMENT ON VIEW v_metricas_turma IS
  'Métricas agregadas por turma - útil para acompanhamento de desempenho';

-- ─────────────────────────────────────────────────────────────────
-- 7. TRIGGER PARA ATUALIZAR updated_at
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_jarvis_correcoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_jarvis_correcoes_updated_at
  BEFORE UPDATE ON jarvis_correcoes
  FOR EACH ROW
  EXECUTE FUNCTION update_jarvis_correcoes_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ═══════════════════════════════════════════════════════════════
