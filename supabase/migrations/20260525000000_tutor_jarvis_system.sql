-- ═══════════════════════════════════════════════════════════════
-- TUTOR JARVIS — SISTEMA DE TUTORIA PEDAGÓGICA CONVERSACIONAL
-- Migration: 20260525000000
-- Descrição: Módulo conversacional com estado contínuo, créditos
--            progressivos por tokens e prompt pedagógico adaptativo.
-- ═══════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════
-- 1. TABELA DE CONVERSAS
--    Campo `modulo` garante extensibilidade futura sem retrabalho.
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS jarvis_conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  modulo          TEXT        NOT NULL DEFAULT 'tutor',
  titulo          TEXT,
  status          TEXT        NOT NULL DEFAULT 'ativa'
                              CHECK (status IN ('ativa', 'arquivada')),
  provider        TEXT        NOT NULL DEFAULT 'openai',
  modelo          TEXT        NOT NULL DEFAULT 'gpt-4o-mini',
  tokens_total    INTEGER     NOT NULL DEFAULT 0,
  creditos_total  INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jarvis_conv_aluno_modulo
  ON jarvis_conversations(aluno_id, modulo, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_jarvis_conv_status
  ON jarvis_conversations(status);

ALTER TABLE jarvis_conversations ENABLE ROW LEVEL SECURITY;

-- Todo acesso via service role (edge functions) ou RPCs SECURITY DEFINER.
-- Políticas bloqueiam acesso direto por clientes para consistência com o
-- padrão existente das demais tabelas Jarvis neste projeto.
CREATE POLICY "jarvis_conversations_block_direct"
  ON jarvis_conversations FOR ALL
  TO authenticated
  USING (false);

COMMENT ON TABLE jarvis_conversations IS
  'Conversas pedagógicas do Jarvis. Extensível para múltiplos módulos via campo modulo.';

-- ════════════════════════════════════════════════════════
-- 2. TABELA DE MENSAGENS
--    Campos status/edited_at/original_conteudo preparados
--    para edição futura de mensagens (não usados na v1).
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS jarvis_messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID        NOT NULL REFERENCES jarvis_conversations(id) ON DELETE CASCADE,
  role              TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  conteudo          TEXT        NOT NULL,
  tokens_input      INTEGER,
  tokens_output     INTEGER,
  tokens_total      INTEGER,
  provider          TEXT,
  modelo            TEXT,
  tempo_resposta_ms INTEGER,
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'invalidated')),
  edited_at         TIMESTAMPTZ DEFAULT NULL,
  original_conteudo TEXT        DEFAULT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jarvis_msg_conv_active
  ON jarvis_messages(conversation_id, created_at ASC)
  WHERE status = 'active';

ALTER TABLE jarvis_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jarvis_messages_block_direct"
  ON jarvis_messages FOR ALL
  TO authenticated
  USING (false);

COMMENT ON TABLE jarvis_messages IS
  'Mensagens das conversas pedagógicas. status+edited_at+original_conteudo preparados para edição futura.';

-- ════════════════════════════════════════════════════════
-- 3. TABELA DE ACUMULADOR DE TOKENS
--    Uma linha por aluno por módulo (UNIQUE constraint).
--    O "troco" de tokens é preservado entre interações,
--    garantindo cobrança proporcional sem arredondamento agressivo.
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS jarvis_credit_accumulator (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id            UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  modulo              TEXT        NOT NULL DEFAULT 'tutor',
  tokens_acumulados   INTEGER     NOT NULL DEFAULT 0 CHECK (tokens_acumulados >= 0),
  ultima_atualizacao  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, modulo)
);

CREATE INDEX IF NOT EXISTS idx_jarvis_accum_aluno
  ON jarvis_credit_accumulator(aluno_id, modulo);

ALTER TABLE jarvis_credit_accumulator ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jarvis_credit_accumulator_block_direct"
  ON jarvis_credit_accumulator FOR ALL
  TO authenticated
  USING (false);

COMMENT ON TABLE jarvis_credit_accumulator IS
  'Acumulador de tokens por aluno por módulo. Débito de crédito ocorre ao atingir limiar configurado em jarvis_system_config.';

-- ════════════════════════════════════════════════════════
-- 4. CONFIGURAÇÕES DO TUTOR EM jarvis_system_config
--    Parametrização por módulo com chaves nomeadas por padrão:
--    jarvis_credito_tokens_{modulo}
-- ════════════════════════════════════════════════════════

INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  ('jarvis_credito_tokens_tutor',
   '3000',
   'Tokens acumulados para débito de 1 crédito — módulo Tutor Jarvis')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  ('jarvis_credito_tokens_assistente',
   '1500',
   'Tokens acumulados para débito de 1 crédito — módulo Assistente de Escrita')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  ('jarvis_credito_tokens_default',
   '3000',
   'Tokens por crédito — fallback quando módulo não tiver chave específica configurada')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  ('tutor_max_historico_msgs',
   '20',
   'Número máximo de mensagens enviadas à IA no contexto da conversa (janela deslizante)')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  ('tutor_max_tokens_resposta',
   '1500',
   'Máximo de tokens por resposta do Tutor Jarvis')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  ('tutor_habilitado',
   'true',
   'Liga/desliga o módulo Tutor Jarvis globalmente (true/false)')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO jarvis_system_config (chave, valor, descricao)
SELECT
  'tutor_system_prompt',
  $PROMPT$Você é o Tutor Jarvis — professor particular de português e redação ENEM.

IDENTIDADE E MISSÃO
Você é um tutor, não um assistente. Sua função é ensinar com profundidade, não apenas responder com agilidade. A diferença entre um chatbot e um professor está em como você medeia o conhecimento.
Seu aluno é um estudante brasileiro se preparando para o ENEM.

MÉTODO SOCRÁTICO ADAPTATIVO
Antes de responder, avalie: o aluno precisa da resposta pronta ou precisa ser guiado a descobri-la?
Quando houver oportunidade pedagógica real, gradua a ajuda:
- Nível 1: pista ou pergunta que oriente o raciocínio
- Nível 2: explicação parcial, indica a direção sem completar
- Nível 3: explicação completa, se o aluno persiste com dificuldade
- Nível 4: modelo resolvido, apenas quando necessário para clareza final

MECANISMO DE ESCAPE SOCRÁTICO (obrigatório)
Identifique sinais e responda com explicação direta e completa quando:
- O aluno demonstra frustração explícita ("já tentei", "não consigo", "só me diz")
- O mesmo erro se repete duas ou mais vezes na conversa
- O aluno pede a resposta diretamente ("me explica logo", "pode falar logo", "não entendi de novo")
- O aluno claramente não tem base para inferir a resposta
- A pergunta é factual ou conceitual (definições, regras, nomenclatura)
Insistir no método socrático quando o aluno está travado é obstáculo, não pedagogia. O objetivo é aprendizagem, não insistência metodológica.

CORREÇÃO ITEM A ITEM (obrigatório)
Se o aluno enviar frases numeradas, múltiplos exemplos, exercícios com alternativas ou trechos distintos para análise, você DEVE analisar cada item individualmente.
Formato obrigatório por item:
1. Diagnóstico: certo, com ajuste necessário ou incorreto
2. Justificativa: por quê — seja específico ao texto do aluno
3. Reformulação (quando necessário): sugestão concreta de reescrita
4. Microensino: o conceito-chave aplicado neste caso específico
Nunca analise múltiplos itens em bloco com resposta genérica.

ESPECIFICIDADE OBRIGATÓRIA
Todo feedback deve apontar onde exatamente ocorre o problema, o que está errado ou pode melhorar, por que é um problema e como melhorar.
Respostas genéricas são proibidas. Se o aluno enviou um texto, frase ou tese, aponte exatamente o trecho problemático.

PROFUNDIDADE ADAPTATIVA
Ajuste a densidade do ensino ao nível demonstrado pelo aluno. Sinais de inferência: complexidade da pergunta, vocabulário usado, erros recorrentes, histórico da conversa, pedidos explícitos.
- Iniciante (pergunta básica, erros simples): definição curta mais um exemplo concreto
- Intermediário (pergunta contextualizada, domínio parcial): conceito mais contraste com o erro mais aplicação no texto do aluno
- Avançado (pergunta técnica, domínio demonstrado): análise sintática ou argumentativa densa mais nuances
Pedidos explícitos têm prioridade: "explica simples" força modo iniciante; "aprofunda" força modo avançado; "não entendi" recomeça do nível abaixo.

ELOGIOS E CORREÇÕES
Elogie apenas quando houver mérito real e identificável. Elogios genéricos não ensinam e perdem valor.
Ao corrigir, seja direto e respeitoso. Se o texto está ruim, diga com explicação clara.

PROPOSTA DE TREINO
Ao final de análises ou correções, quando fizer sentido pedagogicamente, proponha um micro-exercício de fixação. No máximo um exercício por resposta.

CONTEXTO CONTÍNUO
Você tem acesso ao histórico desta conversa. Use-o.
- Reconheça o progresso do aluno ao longo da conversa
- Referencie erros anteriores se o padrão se repetir
- Construa sobre o que já foi explicado — não repita do zero
- Ajuste o nível de detalhe conforme o aluno demonstra entender

ÁREAS DE ATUAÇÃO
Gramática e norma culta, conectivos e coesão textual, estrutura da redação ENEM, construção de tese e argumentação (C2 e C3), repertório sociocultural (C2), proposta de intervenção (C5), interpretação textual, análise de frases e parágrafos escritos pelo aluno, correção comentada de trechos curtos, dúvidas gerais sobre português.

LIMITES
Não responda perguntas fora de português e redação com profundidade — redirecione gentilmente. Não invente regras gramaticais. Se não tiver certeza, admita. Não produza redações completas para o aluno — oriente a construção.

FORMATO DAS RESPOSTAS
Linguagem clara, direta e respeitosa — como um bom professor, não como um sistema formal. Use exemplos concretos. Separe visualmente análises de múltiplos itens. Quando sugerir reformulação, sinalize com "Uma alternativa:" ou "Você poderia reescrever assim:". Limite a no máximo cinco pontos centrais por turno. Prefira parágrafos curtos a blocos densos.$PROMPT$,
  'System prompt pedagógico do Tutor Jarvis — editável pelo admin sem necessidade de deploy'
WHERE NOT EXISTS (
  SELECT 1 FROM jarvis_system_config WHERE chave = 'tutor_system_prompt'
);

-- ════════════════════════════════════════════════════════
-- 5. RPC: listar conversas por email do aluno
-- ════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_tutor_conversas_by_email(
  p_email  TEXT,
  p_modulo TEXT DEFAULT 'tutor'
)
RETURNS TABLE (
  id             UUID,
  titulo         TEXT,
  status         TEXT,
  tokens_total   INTEGER,
  creditos_total INTEGER,
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.titulo,
    c.status,
    c.tokens_total,
    c.creditos_total,
    c.created_at,
    c.updated_at
  FROM jarvis_conversations c
  JOIN profiles p ON p.id = c.aluno_id
  WHERE LOWER(TRIM(p.email))  = LOWER(TRIM(p_email))
    AND p.user_type            = 'aluno'
    AND c.modulo               = p_modulo
    AND c.status               = 'ativa'
  ORDER BY c.updated_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tutor_conversas_by_email(TEXT, TEXT) TO anon, authenticated;

-- ════════════════════════════════════════════════════════
-- 6. RPC: buscar mensagens de uma conversa (com validação de posse)
-- ════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_tutor_mensagens(
  p_conversation_id UUID,
  p_aluno_email     TEXT
)
RETURNS TABLE (
  id           UUID,
  role         TEXT,
  conteudo     TEXT,
  tokens_total INTEGER,
  status       TEXT,
  created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM jarvis_conversations c
    JOIN profiles p ON p.id = c.aluno_id
    WHERE c.id = p_conversation_id
      AND LOWER(TRIM(p.email)) = LOWER(TRIM(p_aluno_email))
      AND p.user_type = 'aluno'
  ) THEN
    RAISE EXCEPTION 'Conversa não encontrada ou acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.role,
    m.conteudo,
    m.tokens_total,
    m.status,
    m.created_at
  FROM jarvis_messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.status           = 'active'
    AND m.role            IN ('user', 'assistant')
  ORDER BY m.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tutor_mensagens(UUID, TEXT) TO anon, authenticated;

-- ════════════════════════════════════════════════════════
-- 7. RPC: arquivar conversa
-- ════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION archive_tutor_conversa(
  p_conversation_id UUID,
  p_aluno_email     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE jarvis_conversations c
  SET    status     = 'arquivada',
         updated_at = NOW()
  FROM   profiles p
  WHERE  c.id       = p_conversation_id
    AND  c.aluno_id = p.id
    AND  LOWER(TRIM(p.email)) = LOWER(TRIM(p_aluno_email))
    AND  p.user_type = 'aluno';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION archive_tutor_conversa(UUID, TEXT) TO anon, authenticated;

-- ════════════════════════════════════════════════════════
-- 8. RPC: incrementar totais de uma conversa (tokens + créditos)
-- ════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_tutor_conversation_totals(
  p_conversation_id UUID,
  p_tokens          INTEGER,
  p_creditos        INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jarvis_conversations
  SET tokens_total   = tokens_total   + p_tokens,
      creditos_total = creditos_total + p_creditos,
      updated_at     = NOW()
  WHERE id = p_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_tutor_conversation_totals(UUID, INTEGER, INTEGER) TO anon, authenticated;

-- ════════════════════════════════════════════════════════
-- 9. RPC: processar créditos por tokens acumulados
--    Lógica: acumula tokens; ao atingir o limiar configurado
--    por módulo, debita crédito(s) e preserva o "troco".
--    Lock de linha garante atomicidade em sessões concorrentes.
-- ════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION process_tutor_credit(
  p_aluno_id     UUID,
  p_modulo       TEXT,
  p_tokens_novos INTEGER
)
RETURNS TABLE (
  creditos_debitados INTEGER,
  acumulador_atual   INTEGER,
  saldo_restante     INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limiar            INTEGER;
  v_acumulador_atual  INTEGER;
  v_creditos_debitar  INTEGER;
  v_novo_acumulador   INTEGER;
  v_saldo_atual       INTEGER;
BEGIN
  -- Limiar configurável por módulo com fallback encadeado
  SELECT COALESCE(
    (SELECT valor::INTEGER FROM jarvis_system_config
     WHERE chave = 'jarvis_credito_tokens_' || p_modulo LIMIT 1),
    (SELECT valor::INTEGER FROM jarvis_system_config
     WHERE chave = 'jarvis_credito_tokens_default' LIMIT 1),
    3000
  ) INTO v_limiar;

  -- Garante registro no acumulador (upsert sem update para preservar idempotência)
  INSERT INTO jarvis_credit_accumulator (aluno_id, modulo, tokens_acumulados)
  VALUES (p_aluno_id, p_modulo, 0)
  ON CONFLICT (aluno_id, modulo) DO NOTHING;

  -- Lock da linha para evitar race condition em sessões paralelas
  SELECT tokens_acumulados INTO v_acumulador_atual
  FROM   jarvis_credit_accumulator
  WHERE  aluno_id = p_aluno_id AND modulo = p_modulo
  FOR UPDATE;

  v_acumulador_atual := v_acumulador_atual + p_tokens_novos;
  v_creditos_debitar := v_acumulador_atual / v_limiar;   -- divisão inteira
  v_novo_acumulador  := v_acumulador_atual % v_limiar;   -- "troco" preservado

  IF v_creditos_debitar > 0 THEN
    -- Lock do saldo para consistência
    SELECT jarvis_creditos INTO v_saldo_atual
    FROM   profiles
    WHERE  id = p_aluno_id
    FOR UPDATE;

    IF v_saldo_atual < v_creditos_debitar THEN
      RAISE EXCEPTION 'insufficient_credits'
        USING DETAIL = format('saldo=%s necessario=%s', v_saldo_atual, v_creditos_debitar);
    END IF;

    UPDATE profiles
    SET    jarvis_creditos = jarvis_creditos - v_creditos_debitar
    WHERE  id = p_aluno_id;

    INSERT INTO jarvis_credit_audit (
      user_id, old_credits, new_credits, amount, action, reason
    ) VALUES (
      p_aluno_id,
      v_saldo_atual,
      v_saldo_atual - v_creditos_debitar,
      v_creditos_debitar,
      'subtract',
      'Tutor Jarvis (' || p_modulo || ') — ' || v_acumulador_atual || ' tokens acumulados'
    );
  ELSE
    SELECT jarvis_creditos INTO v_saldo_atual FROM profiles WHERE id = p_aluno_id;
  END IF;

  -- Atualiza acumulador com o "troco"
  UPDATE jarvis_credit_accumulator
  SET    tokens_acumulados  = v_novo_acumulador,
         ultima_atualizacao = NOW()
  WHERE  aluno_id = p_aluno_id AND modulo = p_modulo;

  RETURN QUERY SELECT
    v_creditos_debitar,
    v_novo_acumulador,
    GREATEST(0, v_saldo_atual - v_creditos_debitar);
END;
$$;

GRANT EXECUTE ON FUNCTION process_tutor_credit(UUID, TEXT, INTEGER) TO anon, authenticated;
