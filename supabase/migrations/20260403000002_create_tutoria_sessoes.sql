-- ═══════════════════════════════════════════════════════════════
-- JARVIS - TABELA DE SESSÕES DE TUTORIA
-- Migration: 20260403000002
-- Descrição: Armazena o progresso do aluno em cada tutoria
--            Permite salvar estado entre etapas e retomar depois
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Criar tabela de sessões ─────────────────────────────────
CREATE TABLE jarvis_tutoria_sessoes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  modo_id               UUID        NOT NULL REFERENCES jarvis_modos(id) ON DELETE CASCADE,
  subtab_nome           TEXT        NOT NULL,

  -- Estado da sessão
  etapa_atual           TEXT        NOT NULL DEFAULT 'preenchimento',
  -- Etapas: 'preenchimento', 'sugestoes', 'validacao', 'gerado'

  -- Dados em cada etapa
  dados_preenchidos     JSONB       NOT NULL DEFAULT '{}',  -- campos preenchidos pelo aluno
  dados_sugeridos       JSONB       DEFAULT '{}',  -- sugestões da IA para campos vazios
  validacao_resultado   JSONB       DEFAULT NULL,  -- resultado da validação pedagógica
  texto_gerado          TEXT        DEFAULT NULL,  -- introdução/parágrafo gerado
  engenharia_paragrafo  JSONB       DEFAULT NULL,  -- análise estrutural (futuro)

  -- Controle
  finalizado            BOOLEAN     DEFAULT false,
  creditos_consumidos   INTEGER     DEFAULT 0,

  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW(),

  -- Uma sessão ativa por usuário/modo/subtab
  UNIQUE(user_id, modo_id, subtab_nome)
);

-- Índices
CREATE INDEX idx_tutoria_sessoes_user ON jarvis_tutoria_sessoes(user_id, atualizado_em DESC);
CREATE INDEX idx_tutoria_sessoes_modo ON jarvis_tutoria_sessoes(modo_id);
CREATE INDEX idx_tutoria_sessoes_etapa ON jarvis_tutoria_sessoes(etapa_atual);
CREATE INDEX idx_tutoria_sessoes_finalizado ON jarvis_tutoria_sessoes(finalizado);

-- Comentários
COMMENT ON TABLE jarvis_tutoria_sessoes IS
  'Sessões de tutoria: salva progresso do aluno em cada subtab';

COMMENT ON COLUMN jarvis_tutoria_sessoes.etapa_atual IS
  'Etapa do fluxo: preenchimento, sugestoes, validacao, gerado';

COMMENT ON COLUMN jarvis_tutoria_sessoes.dados_preenchidos IS
  'Valores dos campos preenchidos manualmente pelo aluno';

COMMENT ON COLUMN jarvis_tutoria_sessoes.dados_sugeridos IS
  'Sugestões da IA para campos deixados em branco';

COMMENT ON COLUMN jarvis_tutoria_sessoes.validacao_resultado IS
  'Devolutiva pedagógica sobre qualidade dos insumos';

COMMENT ON COLUMN jarvis_tutoria_sessoes.texto_gerado IS
  'Texto final gerado (introdução, parágrafo, etc)';

-- ─── 2. RLS ─────────────────────────────────────────────────────
ALTER TABLE jarvis_tutoria_sessoes ENABLE ROW LEVEL SECURITY;

-- Alunos veem apenas suas próprias sessões
-- Como alunos NÃO usam Supabase Auth, precisamos de SECURITY DEFINER
-- As funções RPC farão a verificação por email

-- Admins veem todas as sessões
CREATE POLICY "Admins view all sessions"
  ON jarvis_tutoria_sessoes FOR SELECT
  TO authenticated
  USING (is_main_admin());

-- ─── 3. RPC para buscar ou criar sessão ─────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_tutoria_sessao(
  p_email TEXT,
  p_modo_id UUID,
  p_subtab_nome TEXT
)
RETURNS TABLE (
  id                    UUID,
  etapa_atual           TEXT,
  dados_preenchidos     JSONB,
  dados_sugeridos       JSONB,
  validacao_resultado   JSONB,
  texto_gerado          TEXT,
  engenharia_paragrafo  JSONB,
  finalizado            BOOLEAN,
  creditos_consumidos   INTEGER,
  criado_em             TIMESTAMPTZ,
  atualizado_em         TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_sessao_id UUID;
BEGIN
  -- Buscar user_id pelo email
  SELECT pr.id INTO v_user_id
  FROM profiles pr
  WHERE pr.email = LOWER(TRIM(p_email))
    AND pr.user_type = 'aluno'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', p_email;
  END IF;

  -- Buscar sessão existente ou criar nova
  INSERT INTO jarvis_tutoria_sessoes (user_id, modo_id, subtab_nome, etapa_atual)
  VALUES (v_user_id, p_modo_id, p_subtab_nome, 'preenchimento')
  ON CONFLICT (user_id, modo_id, subtab_nome)
  DO NOTHING
  RETURNING jarvis_tutoria_sessoes.id INTO v_sessao_id;

  -- Se não houve INSERT (já existia), buscar ID
  IF v_sessao_id IS NULL THEN
    SELECT s.id INTO v_sessao_id
    FROM jarvis_tutoria_sessoes s
    WHERE s.user_id = v_user_id
      AND s.modo_id = p_modo_id
      AND s.subtab_nome = p_subtab_nome;
  END IF;

  -- Retornar sessão
  RETURN QUERY
  SELECT
    s.id,
    s.etapa_atual,
    s.dados_preenchidos,
    s.dados_sugeridos,
    s.validacao_resultado,
    s.texto_gerado,
    s.engenharia_paragrafo,
    s.finalizado,
    s.creditos_consumidos,
    s.criado_em,
    s.atualizado_em
  FROM jarvis_tutoria_sessoes s
  WHERE s.id = v_sessao_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_tutoria_sessao(TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_tutoria_sessao(TEXT, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION get_or_create_tutoria_sessao IS
  'Busca sessão ativa ou cria nova. SECURITY DEFINER para alunos sem auth.';

-- ─── 4. RPC para atualizar sessão ───────────────────────────────
CREATE OR REPLACE FUNCTION update_tutoria_sessao(
  p_sessao_id UUID,
  p_etapa_atual TEXT DEFAULT NULL,
  p_dados_preenchidos JSONB DEFAULT NULL,
  p_dados_sugeridos JSONB DEFAULT NULL,
  p_validacao_resultado JSONB DEFAULT NULL,
  p_texto_gerado TEXT DEFAULT NULL,
  p_engenharia_paragrafo JSONB DEFAULT NULL,
  p_finalizado BOOLEAN DEFAULT NULL,
  p_creditos_consumidos INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jarvis_tutoria_sessoes
  SET
    etapa_atual = COALESCE(p_etapa_atual, etapa_atual),
    dados_preenchidos = COALESCE(p_dados_preenchidos, dados_preenchidos),
    dados_sugeridos = COALESCE(p_dados_sugeridos, dados_sugeridos),
    validacao_resultado = COALESCE(p_validacao_resultado, validacao_resultado),
    texto_gerado = COALESCE(p_texto_gerado, texto_gerado),
    engenharia_paragrafo = COALESCE(p_engenharia_paragrafo, engenharia_paragrafo),
    finalizado = COALESCE(p_finalizado, finalizado),
    creditos_consumidos = COALESCE(p_creditos_consumidos, creditos_consumidos),
    atualizado_em = NOW()
  WHERE id = p_sessao_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_tutoria_sessao(
  UUID, TEXT, JSONB, JSONB, JSONB, TEXT, JSONB, BOOLEAN, INTEGER
) TO anon;
GRANT EXECUTE ON FUNCTION update_tutoria_sessao(
  UUID, TEXT, JSONB, JSONB, JSONB, TEXT, JSONB, BOOLEAN, INTEGER
) TO authenticated;

COMMENT ON FUNCTION update_tutoria_sessao IS
  'Atualiza campos de uma sessão. Campos NULL não são alterados.';

-- ─── 5. RPC para resetar sessão ─────────────────────────────────
CREATE OR REPLACE FUNCTION reset_tutoria_sessao(p_sessao_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jarvis_tutoria_sessoes
  SET
    etapa_atual = 'preenchimento',
    dados_preenchidos = '{}',
    dados_sugeridos = '{}',
    validacao_resultado = NULL,
    texto_gerado = NULL,
    engenharia_paragrafo = NULL,
    finalizado = false,
    creditos_consumidos = 0,
    atualizado_em = NOW()
  WHERE id = p_sessao_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_tutoria_sessao(UUID) TO anon;
GRANT EXECUTE ON FUNCTION reset_tutoria_sessao(UUID) TO authenticated;

COMMENT ON FUNCTION reset_tutoria_sessao IS
  'Reseta sessão para estado inicial (para fazer nova tutoria)';

-- ─── Fim da migration ───────────────────────────────────────────
