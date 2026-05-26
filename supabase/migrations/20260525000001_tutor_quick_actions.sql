-- ═══════════════════════════════════════════════════════════════
-- TUTOR JARVIS — AÇÕES RÁPIDAS (ICE BREAKERS) CONFIGURÁVEIS
-- Migration: 20260525000001
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tutor_quick_actions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  label      TEXT        NOT NULL,
  texto      TEXT        NOT NULL,
  icone      TEXT        NOT NULL DEFAULT 'HelpCircle',
  ordem      INTEGER     NOT NULL DEFAULT 0,
  ativo      BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutor_quick_actions_ordem
  ON tutor_quick_actions(ativo, ordem);

ALTER TABLE tutor_quick_actions ENABLE ROW LEVEL SECURITY;

-- Alunos (anon) podem ler ações ativas
CREATE POLICY "quick_actions_read_ativo"
  ON tutor_quick_actions FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

-- Admins podem gerenciar tudo
CREATE POLICY "quick_actions_admin_all"
  ON tutor_quick_actions FOR ALL
  TO authenticated
  USING     (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Seed: as 7 ações iniciais (equivalente ao que estava hardcoded)
INSERT INTO tutor_quick_actions (label, texto, icone, ordem) VALUES
  ('Corrigir tese',       'Quero que você analise minha tese:\n\n',                          'FileText',   1),
  ('Analisar frase',      'Analise esta frase e me diga se usei corretamente:\n\n',           'AlignLeft',  2),
  ('Explicar conectivo',  'Explique como usar o conectivo: ',                                  'Link2',      3),
  ('Revisar argumento',   'Meu argumento ficou superficial? Veja:\n\n',                        'Lightbulb',  4),
  ('Dúvida gramatical',   'Tenho uma dúvida sobre: ',                                          'HelpCircle', 5),
  ('Revisar parágrafo',   'Revise este parágrafo:\n\n',                                        'BookOpen',   6),
  ('Entender repertório', 'Como usar repertório sociocultural na competência 2?',               'Star',       7);
