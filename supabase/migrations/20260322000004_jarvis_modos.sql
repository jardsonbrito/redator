-- ═══════════════════════════════════════════════════════════════
-- JARVIS - SISTEMA DE MÚLTIPLOS MODOS
-- Migration: 20260322000004
-- Descrição: Adiciona tabela de modos do Jarvis, cada um com seu
--            próprio system_prompt e schema de resposta. O modo
--            "Analisar" é criado a partir do prompt já existente.
-- Auth: alunos NÃO usam Supabase Auth — identificados por email.
--       Todas as funções usam SECURITY DEFINER + GRANT TO anon.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Tabela de modos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jarvis_modos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT        NOT NULL UNIQUE,
  label           TEXT        NOT NULL,
  descricao       TEXT,
  icone           TEXT        NOT NULL DEFAULT 'Sparkles',
  system_prompt   TEXT        NOT NULL,
  -- JSON array: [{ chave, rotulo, cor, copiavel? }]
  campos_resposta JSONB       NOT NULL DEFAULT '[]',
  ativo           BOOLEAN     NOT NULL DEFAULT true,
  ordem           INTEGER     NOT NULL DEFAULT 0,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jarvis_modos_ativo_ordem
  ON jarvis_modos(ativo, ordem);

COMMENT ON TABLE jarvis_modos IS
  'Modos de operação do Jarvis. Cada modo tem seu próprio system_prompt e schema de resposta.';
COMMENT ON COLUMN jarvis_modos.campos_resposta IS
  'Array JSON: [{"chave":"...", "rotulo":"...", "cor":"blue|purple|green|amber|gray", "copiavel":true}]';

-- ─── 2. RLS da tabela de modos ──────────────────────────────────
ALTER TABLE jarvis_modos ENABLE ROW LEVEL SECURITY;

-- Alunos (sem Auth) acessam via SECURITY DEFINER — RLS não se aplica a eles.
-- Leitura pública dos modos ativos (para a página do Jarvis via anon key).
CREATE POLICY "Public can read active jarvis_modos"
  ON jarvis_modos FOR SELECT
  TO public
  USING (ativo = true);

-- Admin gerencia todos os modos (usa is_main_admin() como padrão do projeto).
CREATE POLICY "Admin can manage jarvis_modos"
  ON jarvis_modos FOR ALL
  TO authenticated
  USING (is_main_admin());

-- ─── 3. Alterações em jarvis_interactions ───────────────────────

-- Coluna FK para o modo usado na interação
ALTER TABLE jarvis_interactions
  ADD COLUMN IF NOT EXISTS modo_id UUID REFERENCES jarvis_modos(id);

-- Resposta genérica em JSON (cobre qualquer modo, incluindo futuros)
ALTER TABLE jarvis_interactions
  ADD COLUMN IF NOT EXISTS resposta_json JSONB;

-- Tornar colunas de texto nullable para suportar modos com campos diferentes
ALTER TABLE jarvis_interactions
  ALTER COLUMN diagnostico      DROP NOT NULL,
  ALTER COLUMN explicacao       DROP NOT NULL,
  ALTER COLUMN sugestao_reescrita DROP NOT NULL,
  ALTER COLUMN versao_melhorada DROP NOT NULL,
  ALTER COLUMN palavras_melhorada DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jarvis_interactions_modo
  ON jarvis_interactions(modo_id);

-- ─── 4. Modo "Analisar" (migrado do system_prompt atual) ────────
INSERT INTO jarvis_modos (nome, label, descricao, icone, system_prompt, campos_resposta, ativo, ordem)
SELECT
  'analisar',
  'Analisar texto',
  'Diagnóstico pedagógico com sugestão de melhoria e versão lapidada',
  'Sparkles',
  jc.system_prompt,
  '[
    {"chave": "diagnostico",       "rotulo": "Diagnóstico",    "cor": "blue"},
    {"chave": "sugestao_reescrita","rotulo": "Como Melhorar",  "cor": "purple"},
    {"chave": "versao_melhorada",  "rotulo": "Versão Lapidada","cor": "green", "copiavel": true}
  ]'::jsonb,
  true,
  0
FROM jarvis_config jc
WHERE jc.ativo = true
LIMIT 1
ON CONFLICT (nome) DO NOTHING;

-- ─── 5. Associar interações existentes ao modo "Analisar" ───────
UPDATE jarvis_interactions
SET modo_id = (SELECT id FROM jarvis_modos WHERE nome = 'analisar' LIMIT 1)
WHERE modo_id IS NULL;

-- ─── 6. RPC: listar modos ativos (SECURITY DEFINER + anon) ──────
CREATE OR REPLACE FUNCTION get_jarvis_modos_ativos()
RETURNS TABLE (
  id              UUID,
  nome            TEXT,
  label           TEXT,
  descricao       TEXT,
  icone           TEXT,
  campos_resposta JSONB,
  ordem           INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jm.id, jm.nome, jm.label, jm.descricao, jm.icone, jm.campos_resposta, jm.ordem
  FROM jarvis_modos jm
  WHERE jm.ativo = true
  ORDER BY jm.ordem ASC, jm.criado_em ASC;
END;
$$;

-- Alunos não têm sessão Auth — precisam chamar via anon key
GRANT EXECUTE ON FUNCTION get_jarvis_modos_ativos() TO anon;
GRANT EXECUTE ON FUNCTION get_jarvis_modos_ativos() TO authenticated;

COMMENT ON FUNCTION get_jarvis_modos_ativos IS
  'Retorna modos ativos do Jarvis ordenados por ordem. SECURITY DEFINER pois alunos usam anon key.';

-- ─── 7. Atualizar RPC histórico para incluir info do modo ────────
-- DROP necessário pois o tipo de retorno mudou (novos campos)
DROP FUNCTION IF EXISTS get_jarvis_historico_by_email(TEXT);

CREATE OR REPLACE FUNCTION get_jarvis_historico_by_email(p_email TEXT)
RETURNS TABLE (
  id                  UUID,
  texto_original      TEXT,
  diagnostico         TEXT,
  sugestao_reescrita  TEXT,
  versao_melhorada    TEXT,
  resposta_json       JSONB,
  palavras_original   INTEGER,
  palavras_melhorada  INTEGER,
  modo_id             UUID,
  modo_nome           TEXT,
  modo_label          TEXT,
  modo_campos_resposta JSONB,
  created_at          TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Localizar aluno pelo email (identificação por email, sem Supabase Auth)
  SELECT pr.id INTO v_user_id
  FROM profiles pr
  WHERE pr.email = LOWER(TRIM(p_email))
    AND pr.user_type = 'aluno'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ji.id,
    ji.texto_original,
    ji.diagnostico,
    ji.sugestao_reescrita,
    ji.versao_melhorada,
    ji.resposta_json,
    ji.palavras_original,
    ji.palavras_melhorada,
    ji.modo_id,
    jm.nome      AS modo_nome,
    jm.label     AS modo_label,
    jm.campos_resposta AS modo_campos_resposta
  FROM jarvis_interactions ji
  LEFT JOIN jarvis_modos jm ON ji.modo_id = jm.id
  WHERE ji.user_id = v_user_id
  ORDER BY ji.created_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_jarvis_historico_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_jarvis_historico_by_email(TEXT) TO authenticated;

COMMENT ON FUNCTION get_jarvis_historico_by_email IS
  'Retorna histórico do Jarvis por email com info do modo usado. SECURITY DEFINER pois alunos não possuem sessão Supabase Auth.';

-- ─── Fim da migration ───────────────────────────────────────────
