-- ═══════════════════════════════════════════════════════════════
-- JARVIS CORREÇÃO - FUNÇÕES SQL
-- Migration: 20260425000001
-- Descrição: Funções auxiliares para o sistema de correção
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. FUNÇÃO: Buscar Configuração Ativa
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_active_correcao_config()
RETURNS TABLE (
  id UUID,
  versao INTEGER,
  ativo BOOLEAN,
  nome TEXT,
  descricao TEXT,
  provider TEXT,
  model TEXT,
  temperatura DECIMAL(3,2),
  max_tokens INTEGER,
  system_prompt TEXT,
  user_prompt_template TEXT,
  response_schema JSONB,
  custo_creditos INTEGER,
  custo_estimado_usd DECIMAL(6,4),
  criado_por UUID,
  criado_em TIMESTAMPTZ,
  ativado_em TIMESTAMPTZ,
  ativado_por UUID,
  notas TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM jarvis_correcao_config
  WHERE ativo = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_active_correcao_config() IS
  'Retorna a configuração ativa do sistema de correção. NUNCA deve retornar NULL em produção.';

-- ─────────────────────────────────────────────────────────────────
-- 2. FUNÇÃO: Ativar Configuração (Atomic)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ativar_config_correcao(
  config_id_param UUID,
  admin_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_record RECORD;
  old_config_id UUID;
BEGIN
  -- Verificar se admin existe
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = admin_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin não encontrado'
    );
  END IF;

  -- Buscar configuração a ser ativada
  SELECT * INTO config_record
  FROM jarvis_correcao_config
  WHERE id = config_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Configuração não encontrada'
    );
  END IF;

  -- Validar campos obrigatórios
  IF config_record.system_prompt IS NULL OR TRIM(config_record.system_prompt) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'system_prompt é obrigatório e não pode estar vazio'
    );
  END IF;

  IF config_record.user_prompt_template IS NULL OR TRIM(config_record.user_prompt_template) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_prompt_template é obrigatório e não pode estar vazio'
    );
  END IF;

  -- Guardar ID da config antiga (se houver)
  SELECT id INTO old_config_id
  FROM jarvis_correcao_config
  WHERE ativo = true
  LIMIT 1;

  -- Desativar todas as outras (transação atômica)
  UPDATE jarvis_correcao_config
  SET ativo = false
  WHERE ativo = true;

  -- Registrar desativação da antiga
  IF old_config_id IS NOT NULL THEN
    INSERT INTO jarvis_correcao_config_audit (
      config_id,
      acao,
      admin_id,
      observacao
    ) VALUES (
      old_config_id,
      'desativada',
      admin_id_param,
      'Desativada automaticamente ao ativar versão ' || config_record.versao
    );
  END IF;

  -- Ativar a selecionada
  UPDATE jarvis_correcao_config
  SET
    ativo = true,
    ativado_em = NOW(),
    ativado_por = admin_id_param
  WHERE id = config_id_param;

  -- Registrar ativação
  INSERT INTO jarvis_correcao_config_audit (
    config_id,
    acao,
    admin_id,
    observacao
  ) VALUES (
    config_id_param,
    'ativada',
    admin_id_param,
    'Versão ' || config_record.versao || ' ativada'
  );

  RETURN jsonb_build_object(
    'success', true,
    'versao', config_record.versao,
    'nome', config_record.nome,
    'old_config_id', old_config_id
  );
END;
$$;

COMMENT ON FUNCTION ativar_config_correcao IS
  'Ativa uma configuração de forma atômica, desativando todas as outras. Registra em audit.';

-- ─────────────────────────────────────────────────────────────────
-- 3. FUNÇÃO: Consumir Crédito do Professor
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION consumir_credito_professor(
  professor_id_param UUID,
  quantidade INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  professor_record RECORD;
  new_credits INTEGER;
BEGIN
  -- Validar quantidade
  IF quantidade <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quantidade deve ser maior que zero'
    );
  END IF;

  -- Buscar professor com lock
  SELECT id, jarvis_correcao_creditos, nome_completo, email
  INTO professor_record
  FROM professores
  WHERE id = professor_id_param
    AND ativo = true
  FOR UPDATE;

  -- Verificar se professor existe
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Professor não encontrado ou inativo'
    );
  END IF;

  -- Verificar créditos suficientes
  IF COALESCE(professor_record.jarvis_correcao_creditos, 0) < quantidade THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Créditos insuficientes',
      'creditos_atuais', COALESCE(professor_record.jarvis_correcao_creditos, 0),
      'creditos_necessarios', quantidade
    );
  END IF;

  -- Calcular novos créditos
  new_credits := COALESCE(professor_record.jarvis_correcao_creditos, 0) - quantidade;

  -- Atualizar créditos
  UPDATE professores
  SET jarvis_correcao_creditos = new_credits,
      atualizado_em = NOW()
  WHERE id = professor_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Falha ao atualizar créditos'
    );
  END IF;

  -- Registrar na auditoria
  INSERT INTO jarvis_correcao_credit_audit (
    professor_id,
    admin_id,
    old_credits,
    new_credits,
    amount,
    action,
    description,
    reason
  ) VALUES (
    professor_id_param,
    NULL,
    COALESCE(professor_record.jarvis_correcao_creditos, 0),
    new_credits,
    quantidade,
    'subtract',
    'Consumo de ' || quantidade || ' crédito(s) para correção com IA',
    'Uso do sistema de correção'
  );

  RETURN jsonb_build_object(
    'success', true,
    'creditos_anteriores', professor_record.jarvis_correcao_creditos,
    'creditos_atuais', new_credits,
    'quantidade_consumida', quantidade
  );
END;
$$;

COMMENT ON FUNCTION consumir_credito_professor IS
  'Consome créditos de correção do professor de forma atômica. Registra em audit.';

-- ─────────────────────────────────────────────────────────────────
-- 4. FUNÇÃO: Adicionar Créditos ao Professor (Admin)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION adicionar_creditos_professor(
  professor_id_param UUID,
  quantidade INTEGER,
  admin_id_param UUID,
  motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  professor_record RECORD;
  new_credits INTEGER;
BEGIN
  -- Verificar se admin existe
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = admin_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin não encontrado'
    );
  END IF;

  -- Validar quantidade
  IF quantidade = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quantidade não pode ser zero'
    );
  END IF;

  -- Buscar professor com lock
  SELECT id, jarvis_correcao_creditos, nome_completo, email
  INTO professor_record
  FROM professores
  WHERE id = professor_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Professor não encontrado'
    );
  END IF;

  -- Calcular novos créditos
  new_credits := COALESCE(professor_record.jarvis_correcao_creditos, 0) + quantidade;

  -- Garantir que não fique negativo
  IF new_credits < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Operação resultaria em créditos negativos',
      'creditos_atuais', professor_record.jarvis_correcao_creditos,
      'quantidade_solicitada', quantidade
    );
  END IF;

  -- Atualizar créditos
  UPDATE professores
  SET jarvis_correcao_creditos = new_credits,
      atualizado_em = NOW()
  WHERE id = professor_id_param;

  -- Determinar ação
  DECLARE
    action_type TEXT;
  BEGIN
    IF quantidade > 0 THEN
      action_type := 'add';
    ELSE
      action_type := 'subtract';
    END IF;

    -- Registrar na auditoria
    INSERT INTO jarvis_correcao_credit_audit (
      professor_id,
      admin_id,
      old_credits,
      new_credits,
      amount,
      action,
      description,
      reason
    ) VALUES (
      professor_id_param,
      admin_id_param,
      COALESCE(professor_record.jarvis_correcao_creditos, 0),
      new_credits,
      ABS(quantidade),
      action_type,
      'Admin ' || (SELECT nome FROM admin_users WHERE id = admin_id_param) ||
      ' ajustou créditos em ' || quantidade,
      COALESCE(motivo, 'Ajuste manual')
    );
  END;

  RETURN jsonb_build_object(
    'success', true,
    'professor_nome', professor_record.nome_completo,
    'creditos_anteriores', professor_record.jarvis_correcao_creditos,
    'creditos_atuais', new_credits,
    'quantidade_adicionada', quantidade
  );
END;
$$;

COMMENT ON FUNCTION adicionar_creditos_professor IS
  'Adiciona (ou remove) créditos do professor. Apenas admins. Quantidade negativa remove créditos.';

-- ─────────────────────────────────────────────────────────────────
-- 5. FUNÇÃO: Duplicar Configuração (facilita evolução)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION duplicar_config_correcao(
  config_id_origem UUID,
  admin_id_param UUID,
  novo_nome TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_origem RECORD;
  nova_versao INTEGER;
  novo_config_id UUID;
BEGIN
  -- Verificar se admin existe
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = admin_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin não encontrado'
    );
  END IF;

  -- Buscar configuração origem
  SELECT * INTO config_origem
  FROM jarvis_correcao_config
  WHERE id = config_id_origem;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Configuração origem não encontrada'
    );
  END IF;

  -- Determinar próxima versão
  SELECT COALESCE(MAX(versao), 0) + 1 INTO nova_versao
  FROM jarvis_correcao_config;

  -- Criar nova configuração (duplicada, mas inativa)
  INSERT INTO jarvis_correcao_config (
    versao,
    ativo,
    nome,
    descricao,
    provider,
    model,
    temperatura,
    max_tokens,
    system_prompt,
    user_prompt_template,
    response_schema,
    custo_creditos,
    custo_estimado_usd,
    criado_por,
    notas
  ) VALUES (
    nova_versao,
    false, -- SEMPRE inativa ao duplicar
    COALESCE(novo_nome, config_origem.nome || ' (cópia)'),
    'Duplicada da v' || config_origem.versao || ': ' || COALESCE(config_origem.descricao, ''),
    config_origem.provider,
    config_origem.model,
    config_origem.temperatura,
    config_origem.max_tokens,
    config_origem.system_prompt,
    config_origem.user_prompt_template,
    config_origem.response_schema,
    config_origem.custo_creditos,
    config_origem.custo_estimado_usd,
    admin_id_param,
    'Duplicada da v' || config_origem.versao
  ) RETURNING id INTO novo_config_id;

  -- Registrar na auditoria
  INSERT INTO jarvis_correcao_config_audit (
    config_id,
    acao,
    admin_id,
    mudancas,
    observacao
  ) VALUES (
    novo_config_id,
    'duplicada',
    admin_id_param,
    jsonb_build_object('config_origem_id', config_id_origem, 'versao_origem', config_origem.versao),
    'Duplicada da v' || config_origem.versao
  );

  RETURN jsonb_build_object(
    'success', true,
    'nova_versao', nova_versao,
    'novo_config_id', novo_config_id,
    'versao_origem', config_origem.versao
  );
END;
$$;

COMMENT ON FUNCTION duplicar_config_correcao IS
  'Duplica uma configuração existente, criando nova versão inativa. Facilita evolução incremental.';

-- ─────────────────────────────────────────────────────────────────
-- 6. FUNÇÃO: Obter Próxima Versão
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_proxima_versao_config()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(versao), 0) + 1
  FROM jarvis_correcao_config;
$$;

COMMENT ON FUNCTION get_proxima_versao_config IS
  'Retorna o número da próxima versão disponível';

-- ═══════════════════════════════════════════════════════════════
-- FIM DAS FUNÇÕES
-- ═══════════════════════════════════════════════════════════════
