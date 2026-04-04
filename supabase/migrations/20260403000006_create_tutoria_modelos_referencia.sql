-- ═══════════════════════════════════════════════════════════════
-- JARVIS - MODELOS DE REFERÊNCIA PARA CALIBRAÇÃO
-- Migration: 20260403000006
-- Descrição: Permite cadastrar introduções exemplares que servem
--            de base de calibragem (few-shot learning)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Tabela de modelos de referência ─────────────────────────
CREATE TABLE jarvis_tutoria_modelos_referencia (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subtab_id           UUID        NOT NULL REFERENCES jarvis_tutoria_subtabs(id) ON DELETE CASCADE,

  -- DADOS DO MODELO
  titulo              TEXT        NOT NULL,
  tema                TEXT        NOT NULL,
  texto_modelo        TEXT        NOT NULL,

  -- METADADOS AUTOMÁTICOS (calculados)
  palavras            INTEGER,
  periodos            INTEGER,
  estrutura_detectada JSONB,

  -- CONTROLE DE USO
  ativo               BOOLEAN     DEFAULT true,
  ordem_prioridade    INTEGER     DEFAULT 0,

  -- ANOTAÇÕES PEDAGÓGICAS
  observacoes         TEXT,
  tags                TEXT[],

  criado_em           TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modelos_subtab ON jarvis_tutoria_modelos_referencia(subtab_id, ativo, ordem_prioridade DESC);
CREATE INDEX idx_modelos_tags ON jarvis_tutoria_modelos_referencia USING GIN(tags);

COMMENT ON TABLE jarvis_tutoria_modelos_referencia IS
  'Modelos de introdução para calibrar estilo e estrutura do Jarvis (few-shot learning)';

COMMENT ON COLUMN jarvis_tutoria_modelos_referencia.texto_modelo IS
  'Texto completo da introdução exemplar';

COMMENT ON COLUMN jarvis_tutoria_modelos_referencia.ordem_prioridade IS
  'Maior valor = maior prioridade (aparece primeiro no prompt)';

-- ─── 2. Função para calcular metadados automaticamente ──────────
CREATE OR REPLACE FUNCTION calcular_metadados_modelo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_palavras INTEGER;
  v_periodos INTEGER;
BEGIN
  -- Contar palavras
  v_palavras := array_length(regexp_split_to_array(TRIM(NEW.texto_modelo), '\s+'), 1);

  -- Contar períodos (split por . ! ?)
  v_periodos := array_length(
    regexp_split_to_array(
      regexp_replace(NEW.texto_modelo, '[.!?]+\s*', '|', 'g'),
      '\|'
    ),
    1
  ) - 1;  -- -1 porque o último split é vazio

  -- Se não houver pontuação, contar como 1 período
  IF v_periodos < 1 THEN
    v_periodos := 1;
  END IF;

  NEW.palavras := v_palavras;
  NEW.periodos := v_periodos;

  -- Estrutura básica (pode ser expandido futuramente)
  NEW.estrutura_detectada := jsonb_build_object(
    'palavras', v_palavras,
    'periodos', v_periodos,
    'calculado_em', NOW()
  );

  RETURN NEW;
END;
$$;

-- Trigger para calcular ao inserir/atualizar
CREATE TRIGGER trigger_calcular_metadados_modelo
  BEFORE INSERT OR UPDATE ON jarvis_tutoria_modelos_referencia
  FOR EACH ROW
  WHEN (NEW.texto_modelo IS NOT NULL)
  EXECUTE FUNCTION calcular_metadados_modelo();

-- ─── 3. RLS ─────────────────────────────────────────────────────
ALTER TABLE jarvis_tutoria_modelos_referencia ENABLE ROW LEVEL SECURITY;

-- Public pode ler modelos ativos (necessário para edge functions)
CREATE POLICY "Public can read active modelos"
  ON jarvis_tutoria_modelos_referencia FOR SELECT
  TO public
  USING (ativo = true);

-- Admins gerenciam todos
CREATE POLICY "Admins manage all modelos"
  ON jarvis_tutoria_modelos_referencia FOR ALL
  TO authenticated
  USING (is_main_admin());

-- ─── 4. RPCs de gerenciamento ───────────────────────────────────

-- Buscar modelos de uma subtab (ordenados por prioridade)
CREATE OR REPLACE FUNCTION get_modelos_referencia(
  p_subtab_id UUID,
  p_apenas_ativos BOOLEAN DEFAULT true,
  p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id                  UUID,
  subtab_id           UUID,
  titulo              TEXT,
  tema                TEXT,
  texto_modelo        TEXT,
  palavras            INTEGER,
  periodos            INTEGER,
  estrutura_detectada JSONB,
  ativo               BOOLEAN,
  ordem_prioridade    INTEGER,
  observacoes         TEXT,
  tags                TEXT[],
  criado_em           TIMESTAMPTZ,
  atualizado_em       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.subtab_id,
    m.titulo,
    m.tema,
    m.texto_modelo,
    m.palavras,
    m.periodos,
    m.estrutura_detectada,
    m.ativo,
    m.ordem_prioridade,
    m.observacoes,
    m.tags,
    m.criado_em,
    m.atualizado_em
  FROM jarvis_tutoria_modelos_referencia m
  WHERE m.subtab_id = p_subtab_id
    AND (NOT p_apenas_ativos OR m.ativo = true)
  ORDER BY m.ordem_prioridade DESC, m.criado_em DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_modelos_referencia(UUID, BOOLEAN, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_modelos_referencia(UUID, BOOLEAN, INTEGER) TO authenticated;

-- Inserir modelo
CREATE OR REPLACE FUNCTION insert_modelo_referencia(
  p_subtab_id UUID,
  p_titulo TEXT,
  p_tema TEXT,
  p_texto_modelo TEXT,
  p_ordem_prioridade INTEGER DEFAULT 0,
  p_observacoes TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Verificar se usuário é admin
  IF NOT is_main_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem cadastrar modelos';
  END IF;

  INSERT INTO jarvis_tutoria_modelos_referencia (
    subtab_id,
    titulo,
    tema,
    texto_modelo,
    ordem_prioridade,
    observacoes,
    tags
  ) VALUES (
    p_subtab_id,
    p_titulo,
    p_tema,
    p_texto_modelo,
    p_ordem_prioridade,
    p_observacoes,
    p_tags
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_modelo_referencia(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT[]) TO authenticated;

-- Atualizar modelo
CREATE OR REPLACE FUNCTION update_modelo_referencia(
  p_id UUID,
  p_titulo TEXT DEFAULT NULL,
  p_tema TEXT DEFAULT NULL,
  p_texto_modelo TEXT DEFAULT NULL,
  p_ordem_prioridade INTEGER DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT is_main_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem atualizar modelos';
  END IF;

  UPDATE jarvis_tutoria_modelos_referencia
  SET
    titulo = COALESCE(p_titulo, titulo),
    tema = COALESCE(p_tema, tema),
    texto_modelo = COALESCE(p_texto_modelo, texto_modelo),
    ordem_prioridade = COALESCE(p_ordem_prioridade, ordem_prioridade),
    observacoes = COALESCE(p_observacoes, observacoes),
    tags = COALESCE(p_tags, tags),
    atualizado_em = NOW()
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_modelo_referencia(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT[]) TO authenticated;

-- Deletar modelo
CREATE OR REPLACE FUNCTION delete_modelo_referencia(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT is_main_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem deletar modelos';
  END IF;

  DELETE FROM jarvis_tutoria_modelos_referencia
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_modelo_referencia(UUID) TO authenticated;

-- Alternar ativo/inativo
CREATE OR REPLACE FUNCTION toggle_modelo_ativo(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_novo_estado BOOLEAN;
BEGIN
  -- Verificar se usuário é admin
  IF NOT is_main_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar modelos';
  END IF;

  UPDATE jarvis_tutoria_modelos_referencia
  SET ativo = NOT ativo,
      atualizado_em = NOW()
  WHERE id = p_id
  RETURNING ativo INTO v_novo_estado;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modelo não encontrado';
  END IF;

  RETURN v_novo_estado;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_modelo_ativo(UUID) TO authenticated;

COMMENT ON FUNCTION get_modelos_referencia IS
  'Retorna modelos de referência de uma subtab, ordenados por prioridade';

COMMENT ON FUNCTION insert_modelo_referencia IS
  'Cadastra novo modelo de referência (apenas admins)';

-- ─── Fim da migration ───────────────────────────────────────────
