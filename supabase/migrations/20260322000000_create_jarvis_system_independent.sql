-- ═══════════════════════════════════════════════════════════════
-- JARVIS - SISTEMA DE CRÉDITOS INDEPENDENTE
-- Migration: 20260322000000
-- Descrição: Implementa sistema completo do Jarvis com créditos isolados
-- ═══════════════════════════════════════════════════════════════

-- 1. Adicionar coluna de créditos Jarvis na tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS jarvis_creditos INTEGER NOT NULL DEFAULT 0
CHECK (jarvis_creditos >= 0);

CREATE INDEX IF NOT EXISTS idx_profiles_jarvis_creditos
  ON profiles(jarvis_creditos);

COMMENT ON COLUMN profiles.jarvis_creditos IS
  'Créditos exclusivos para o Jarvis (independente do sistema de redações)';

-- 2. Tabela de auditoria de créditos Jarvis
CREATE TABLE IF NOT EXISTS jarvis_credit_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  old_credits INTEGER NOT NULL,
  new_credits INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('add', 'subtract', 'set')),
  reason TEXT,
  description TEXT,
  interaction_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jarvis_credit_audit_user ON jarvis_credit_audit(user_id, created_at DESC);
CREATE INDEX idx_jarvis_credit_audit_admin ON jarvis_credit_audit(admin_id);
CREATE INDEX idx_jarvis_credit_audit_action ON jarvis_credit_audit(action);

-- RLS
ALTER TABLE jarvis_credit_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem histórico próprio Jarvis"
  ON jarvis_credit_audit FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins veem todo histórico Jarvis"
  ON jarvis_credit_audit FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

COMMENT ON TABLE jarvis_credit_audit IS
  'Auditoria exclusiva dos créditos do Jarvis (separada do sistema geral)';

-- 3. Tabela de configuração Jarvis
CREATE TABLE IF NOT EXISTS jarvis_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  versao INTEGER NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT false,
  nome TEXT NOT NULL,
  descricao TEXT,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperatura DECIMAL(2,1) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1024,
  system_prompt TEXT NOT NULL,
  limite_palavras_entrada INTEGER DEFAULT 500,
  limite_consultas_hora INTEGER DEFAULT 5,
  peso_distribuicao INTEGER DEFAULT 0,
  criado_por UUID REFERENCES admin_users(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_temperatura CHECK (temperatura >= 0 AND temperatura <= 2),
  CONSTRAINT valid_model CHECK (model IN ('gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'))
);

CREATE UNIQUE INDEX idx_jarvis_config_ativo_unico
  ON jarvis_config(ativo)
  WHERE ativo = true AND peso_distribuicao = 0;

CREATE INDEX idx_jarvis_config_versao ON jarvis_config(versao DESC);

COMMENT ON TABLE jarvis_config IS 'Configurações calibráveis do Jarvis';
COMMENT ON COLUMN jarvis_config.system_prompt IS 'Prompt completo enviado para OpenAI (calibrável)';
COMMENT ON COLUMN jarvis_config.peso_distribuicao IS 'Peso para A/B testing (0 = não participar)';

-- 4. Tabela de interações Jarvis
CREATE TABLE IF NOT EXISTS jarvis_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  texto_original TEXT NOT NULL,
  palavras_original INTEGER NOT NULL,
  diagnostico TEXT NOT NULL,
  explicacao TEXT NOT NULL,
  sugestao_reescrita TEXT NOT NULL,
  versao_melhorada TEXT NOT NULL,
  palavras_melhorada INTEGER NOT NULL,
  config_version_id UUID REFERENCES jarvis_config(id),
  model_used TEXT NOT NULL,
  temperatura DECIMAL(2,1),
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  tempo_resposta_ms INTEGER,
  custo_estimado DECIMAL(8,6),
  feedback_util BOOLEAN,
  feedback_comentario TEXT,
  expansao_excessiva BOOLEAN DEFAULT false,
  possivel_problema BOOLEAN DEFAULT false,
  creditos_consumidos INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jarvis_interactions_user ON jarvis_interactions(user_id, created_at DESC);
CREATE INDEX idx_jarvis_interactions_config ON jarvis_interactions(config_version_id);
CREATE INDEX idx_jarvis_interactions_problemas ON jarvis_interactions(possivel_problema) WHERE possivel_problema = true;
CREATE INDEX idx_jarvis_interactions_feedback ON jarvis_interactions(feedback_util) WHERE feedback_util IS NOT NULL;

-- Adicionar FK para credit_audit após criar interactions
ALTER TABLE jarvis_credit_audit
ADD CONSTRAINT fk_interaction_id
FOREIGN KEY (interaction_id) REFERENCES jarvis_interactions(id) ON DELETE SET NULL;

-- RLS para interactions
ALTER TABLE jarvis_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alunos veem suas interações Jarvis"
  ON jarvis_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins veem todas interações Jarvis"
  ON jarvis_interactions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

COMMENT ON TABLE jarvis_interactions IS 'Histórico completo de todas as interações com o Jarvis';

-- 5. Função para consumir crédito Jarvis
CREATE OR REPLACE FUNCTION consume_jarvis_credit(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  new_credits INTEGER;
BEGIN
  -- Buscar usuário com lock
  SELECT id, jarvis_creditos, nome, email
  INTO user_record
  FROM profiles
  WHERE id = target_user_id
    AND user_type = 'aluno'
  FOR UPDATE;

  -- Verificar se usuário existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', target_user_id;
  END IF;

  -- Verificar créditos suficientes
  IF COALESCE(user_record.jarvis_creditos, 0) < 1 THEN
    RAISE EXCEPTION 'Créditos Jarvis insuficientes: atual=%, necessário=1',
      user_record.jarvis_creditos;
  END IF;

  -- Calcular novos créditos
  new_credits := COALESCE(user_record.jarvis_creditos, 0) - 1;

  -- Atualizar créditos
  UPDATE profiles
  SET jarvis_creditos = new_credits,
      updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar créditos Jarvis para usuário: %', target_user_id;
  END IF;

  -- Registrar na auditoria
  INSERT INTO jarvis_credit_audit (
    user_id,
    admin_id,
    old_credits,
    new_credits,
    amount,
    action,
    description,
    reason
  ) VALUES (
    target_user_id,
    NULL,
    COALESCE(user_record.jarvis_creditos, 0),
    new_credits,
    1,
    'subtract',
    'Consumo de 1 crédito Jarvis para análise de texto',
    'Uso do Jarvis'
  );

  -- Retornar novos créditos
  RETURN new_credits;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro em consume_jarvis_credit: %', SQLERRM;
    RAISE;
END;
$$;

-- 6. Função para adicionar créditos Jarvis
CREATE OR REPLACE FUNCTION add_jarvis_credits(
  target_user_id UUID,
  credit_amount INTEGER,
  admin_user_id UUID,
  reason_text TEXT DEFAULT 'Adição manual de créditos'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  new_credits INTEGER;
BEGIN
  -- Validar quantidade
  IF credit_amount <= 0 THEN
    RAISE EXCEPTION 'Quantidade de créditos deve ser positiva';
  END IF;

  -- Buscar usuário
  SELECT id, jarvis_creditos, nome, email
  INTO user_record
  FROM profiles
  WHERE id = target_user_id
    AND user_type = 'aluno'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', target_user_id;
  END IF;

  -- Calcular novos créditos
  new_credits := COALESCE(user_record.jarvis_creditos, 0) + credit_amount;

  -- Atualizar
  UPDATE profiles
  SET jarvis_creditos = new_credits,
      updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar créditos Jarvis';
  END IF;

  -- Auditoria
  INSERT INTO jarvis_credit_audit (
    user_id,
    admin_id,
    old_credits,
    new_credits,
    amount,
    action,
    description,
    reason
  ) VALUES (
    target_user_id,
    admin_user_id,
    COALESCE(user_record.jarvis_creditos, 0),
    new_credits,
    credit_amount,
    'add',
    format('Adição de %s crédito(s) Jarvis por admin', credit_amount),
    reason_text
  );

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro em add_jarvis_credits: %', SQLERRM;
    RETURN false;
END;
$$;

-- 7. Função para definir créditos Jarvis
CREATE OR REPLACE FUNCTION set_jarvis_credits(
  target_user_id UUID,
  new_amount INTEGER,
  admin_user_id UUID,
  reason_text TEXT DEFAULT 'Definição manual de créditos'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Validar quantidade
  IF new_amount < 0 THEN
    RAISE EXCEPTION 'Quantidade de créditos não pode ser negativa';
  END IF;

  -- Buscar usuário
  SELECT id, jarvis_creditos, nome, email
  INTO user_record
  FROM profiles
  WHERE id = target_user_id
    AND user_type = 'aluno'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', target_user_id;
  END IF;

  -- Atualizar
  UPDATE profiles
  SET jarvis_creditos = new_amount,
      updated_at = NOW()
  WHERE id = target_user_id;

  -- Auditoria
  INSERT INTO jarvis_credit_audit (
    user_id,
    admin_id,
    old_credits,
    new_credits,
    amount,
    action,
    description,
    reason
  ) VALUES (
    target_user_id,
    admin_user_id,
    COALESCE(user_record.jarvis_creditos, 0),
    new_amount,
    ABS(new_amount - COALESCE(user_record.jarvis_creditos, 0)),
    'set',
    format('Créditos Jarvis definidos para %s por admin', new_amount),
    reason_text
  );

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro em set_jarvis_credits: %', SQLERRM;
    RETURN false;
END;
$$;

-- 8. Função para buscar créditos por email
CREATE OR REPLACE FUNCTION get_jarvis_credits_by_email(user_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credit_amount INTEGER;
BEGIN
  SELECT jarvis_creditos
  INTO credit_amount
  FROM profiles
  WHERE email = LOWER(TRIM(user_email))
    AND user_type = 'aluno'
  LIMIT 1;

  RETURN COALESCE(credit_amount, 0);
END;
$$;

-- 9. Função para buscar configuração ativa
CREATE OR REPLACE FUNCTION get_active_jarvis_config()
RETURNS TABLE (
  id UUID,
  versao INTEGER,
  model TEXT,
  temperatura DECIMAL,
  max_tokens INTEGER,
  system_prompt TEXT,
  limite_palavras_entrada INTEGER,
  limite_consultas_hora INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se há A/B testing ativo, escolhe aleatoriamente
  IF EXISTS (SELECT 1 FROM jarvis_config WHERE peso_distribuicao > 0) THEN
    RETURN QUERY
    SELECT
      jc.id, jc.versao, jc.model, jc.temperatura, jc.max_tokens,
      jc.system_prompt, jc.limite_palavras_entrada, jc.limite_consultas_hora
    FROM jarvis_config jc
    WHERE jc.peso_distribuicao > 0
    ORDER BY RANDOM() * jc.peso_distribuicao DESC
    LIMIT 1;
  ELSE
    -- Caso normal: retorna a única config ativa
    RETURN QUERY
    SELECT
      jc.id, jc.versao, jc.model, jc.temperatura, jc.max_tokens,
      jc.system_prompt, jc.limite_palavras_entrada, jc.limite_consultas_hora
    FROM jarvis_config jc
    WHERE jc.ativo = true
    LIMIT 1;
  END IF;
END;
$$;

-- 10. Função para verificar rate limit
CREATE OR REPLACE FUNCTION check_jarvis_rate_limit(
  p_user_id UUID,
  p_limite_hora INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consultas_ultima_hora INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO consultas_ultima_hora
  FROM jarvis_interactions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour';

  RETURN consultas_ultima_hora < p_limite_hora;
END;
$$;

-- 11. Grants
GRANT EXECUTE ON FUNCTION consume_jarvis_credit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_jarvis_credits(UUID, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_jarvis_credits(UUID, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_jarvis_credits_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_jarvis_config() TO authenticated;
GRANT EXECUTE ON FUNCTION check_jarvis_rate_limit(UUID, INTEGER) TO authenticated;

-- 12. RLS para jarvis_config
ALTER TABLE jarvis_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ler configs ativas"
  ON jarvis_config FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Admins gerenciam configs"
  ON jarvis_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- 13. Configuração inicial (Versão 1.0)
INSERT INTO jarvis_config (
  versao, ativo, nome, descricao, system_prompt
) VALUES (
  1,
  true,
  'Versão 1.0 - Inicial',
  'Primeira versão do Jarvis com sistema de créditos independente',
  'Você é Jarvis, assistente pedagógico de redação ENEM.

IMPORTANTE: Sua resposta DEVE seguir este formato JSON exato:

{
  "diagnostico": "Análise objetiva do texto apresentado",
  "explicacao": "Explicação pedagógica dos problemas identificados",
  "sugestao_reescrita": "Orientação de como o aluno pode melhorar",
  "versao_melhorada": "Texto reformulado mantendo a ideia original"
}

REGRAS OBRIGATÓRIAS:
1. NUNCA expanda a ideia do aluno
2. NUNCA crie novos argumentos
3. NUNCA adicione informações que o aluno não forneceu
4. Apenas reformule a ideia ORIGINAL, melhorando:
   - Clareza e objetividade
   - Estrutura frasal (ordem direta)
   - Coesão textual (conectivos adequados)
   - Formalidade acadêmica (sem rebuscamento)
   - Eliminação de vícios de linguagem
5. A "versao_melhorada" deve ter tamanho SIMILAR ao original
6. Preserve o vocabulário do aluno sempre que possível
7. Mantenha a autoria: o aluno deve reconhecer sua própria ideia

EXEMPLO DE ANÁLISE:
Entrada: "A internet é muito importante hoje em dia porque facilita a vida."

Saída:
{
  "diagnostico": "Frase com ideia válida, mas generalista e pouco desenvolvida. Uso de expressão coloquial (''hoje em dia'') e conectivo fraco (''porque'').",
  "explicacao": "Na redação ENEM, evite expressões vagas como ''muito importante'' e ''hoje em dia''. O conectivo ''porque'' é informal; prefira ''uma vez que'', ''visto que''. A ideia precisa de mais precisão sobre COMO a internet facilita.",
  "sugestao_reescrita": "Substitua a expressão temporal coloquial por contexto atual. Especifique minimamente o tipo de facilidade. Use conectivo formal.",
  "versao_melhorada": "A internet constitui ferramenta essencial na contemporaneidade, visto que facilita o acesso à informação e a comunicação."
}'
);

-- 14. Comentários das funções
COMMENT ON FUNCTION consume_jarvis_credit IS 'Consome 1 crédito Jarvis (sistema independente)';
COMMENT ON FUNCTION add_jarvis_credits IS 'Adiciona créditos Jarvis para um usuário (apenas admin)';
COMMENT ON FUNCTION set_jarvis_credits IS 'Define quantidade exata de créditos Jarvis (apenas admin)';
COMMENT ON FUNCTION get_jarvis_credits_by_email IS 'Retorna saldo de créditos Jarvis por email';
COMMENT ON FUNCTION get_active_jarvis_config IS 'Retorna configuração ativa do Jarvis (com suporte a A/B testing)';
COMMENT ON FUNCTION check_jarvis_rate_limit IS 'Verifica se usuário atingiu limite de consultas por hora';

-- Fim da migration
