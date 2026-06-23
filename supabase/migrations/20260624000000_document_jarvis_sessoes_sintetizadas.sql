-- ═══════════════════════════════════════════════════════════════
-- DOCUMENTAÇÃO: jarvis_sessoes_sintetizadas
-- Migration: 20260624000000
-- Descrição: Tabela criada diretamente no console Supabase entre
--            2026-05-25 e 2026-06-05, sem migration versionada.
--            Esta migration a documenta e adiciona índices faltantes.
--            Schema auditado em 2026-06-23 via REST API.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Criar tabela apenas se não existir (idempotente) ────────
CREATE TABLE IF NOT EXISTS jarvis_sessoes_sintetizadas (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculo com conversa conversacional (nullable: sínteses antigas podem não ter)
  conversa_id           UUID          REFERENCES jarvis_conversations(id) ON DELETE SET NULL,

  -- Identificação do aluno (aluno_id é o FK canônico; aluno_email é denormalizado para leitura)
  aluno_id              UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  aluno_email           TEXT          NOT NULL,
  aluno_nome            TEXT,
  turma                 TEXT,

  -- Contexto pedagógico da sessão
  subtab_nome           TEXT,         -- ex: 'introducao', 'desenvolvimento', 'conclusao', 'analisar', 'melhorar'

  -- Síntese gerada pela IA
  resumo                TEXT,
  pontos_positivos      TEXT,         -- adicionado em 20260605120000
  habilidades           JSONB         NOT NULL DEFAULT '[]',  -- [{label, nivel: verde|amarelo|vermelho}]
  dificuldades          TEXT[]        NOT NULL DEFAULT '{}',
  proximos_passos       TEXT[]        NOT NULL DEFAULT '{}',
  orientacao_professor  TEXT,
  tags_dificuldades     TEXT[]        NOT NULL DEFAULT '{}',
  texto_completo        TEXT          NOT NULL DEFAULT '',    -- markdown completo da síntese

  -- Métricas da sessão
  duracao_minutos       INTEGER       NOT NULL DEFAULT 0,
  total_mensagens       INTEGER       NOT NULL DEFAULT 0,
  exercicios_estimados  INTEGER       NOT NULL DEFAULT 0,

  -- Avaliação do aluno (1–5 estrelas) — adicionado em 20260605130000
  avaliacao_aluno       INTEGER       CHECK (avaliacao_aluno BETWEEN 1 AND 5),

  -- Soft-delete do lado do aluno (não exclui do ponto de vista do admin/professor)
  deleted_by_aluno      BOOLEAN       NOT NULL DEFAULT false,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── 2. Índices (IF NOT EXISTS para ser idempotente) ────────────

-- Busca por aluno (hook useJarvisSessoes usa aluno_email)
CREATE INDEX IF NOT EXISTS idx_jarvis_sint_email
  ON jarvis_sessoes_sintetizadas (aluno_email);

-- Busca por aluno_id (FK direto para profiles)
CREATE INDEX IF NOT EXISTS idx_jarvis_sint_aluno_id
  ON jarvis_sessoes_sintetizadas (aluno_id);

-- Ordenação e filtro por data (principal eixo de consulta admin)
CREATE INDEX IF NOT EXISTS idx_jarvis_sint_created_at
  ON jarvis_sessoes_sintetizadas (created_at DESC);

-- Filtro por turma (usado no admin)
CREATE INDEX IF NOT EXISTS idx_jarvis_sint_turma
  ON jarvis_sessoes_sintetizadas (turma);

-- Filtro do aluno (ocultar o que ele "deletou")
CREATE INDEX IF NOT EXISTS idx_jarvis_sint_deleted
  ON jarvis_sessoes_sintetizadas (deleted_by_aluno)
  WHERE deleted_by_aluno = true;

-- ─── 3. RLS (confirmar que está habilitada) ─────────────────────
ALTER TABLE jarvis_sessoes_sintetizadas ENABLE ROW LEVEL SECURITY;

-- Política para admins verem todas as sessões (incluindo deleted_by_aluno = true)
CREATE POLICY IF NOT EXISTS "Admins view all sinteses"
  ON jarvis_sessoes_sintetizadas FOR SELECT
  TO authenticated
  USING (is_main_admin());

-- ─── Fim da migration ───────────────────────────────────────────
