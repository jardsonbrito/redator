-- Tabela principal de interações (enquetes, votações, etc.)
CREATE TABLE IF NOT EXISTS interacoes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                  text NOT NULL,
  descricao               text,
  tipo                    text NOT NULL DEFAULT 'enquete',
  tipo_resposta           text NOT NULL DEFAULT 'alternativas',
  pergunta                text NOT NULL,
  ativa                   boolean NOT NULL DEFAULT true,
  mostrar_resultado_aluno boolean NOT NULL DEFAULT false,
  ordem                   int NOT NULL DEFAULT 0,
  encerramento_em         timestamptz,
  criado_em               timestamptz NOT NULL DEFAULT now(),
  atualizado_em           timestamptz NOT NULL DEFAULT now()
);

-- Alternativas de cada interação
CREATE TABLE IF NOT EXISTS interacoes_alternativas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interacao_id uuid NOT NULL REFERENCES interacoes(id) ON DELETE CASCADE,
  texto        text NOT NULL,
  ordem        int NOT NULL DEFAULT 0
);

-- Respostas dos alunos (UNIQUE impede resposta dupla por aluno)
-- alternativa_id é nullable para respostas abertas
-- resposta_texto armazena texto livre
CREATE TABLE IF NOT EXISTS interacoes_respostas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interacao_id   uuid NOT NULL REFERENCES interacoes(id) ON DELETE CASCADE,
  email_aluno    text NOT NULL,
  alternativa_id uuid REFERENCES interacoes_alternativas(id),
  resposta_texto text,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_resposta_por_aluno UNIQUE (interacao_id, email_aluno)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_interacoes_ativa ON interacoes(ativa, ordem);
CREATE INDEX IF NOT EXISTS idx_interacoes_alt_interacao ON interacoes_alternativas(interacao_id, ordem);
CREATE INDEX IF NOT EXISTS idx_interacoes_respostas_interacao ON interacoes_respostas(interacao_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_respostas_email ON interacoes_respostas(email_aluno);

-- RLS
ALTER TABLE interacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes_alternativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes_respostas ENABLE ROW LEVEL SECURITY;

-- ── Políticas: alunos (anon) ─────────────────────────────────────────────────

-- Alunos lêem interações ativas
CREATE POLICY "publico_le_interacoes_ativas" ON interacoes
  FOR SELECT USING (ativa = true);

-- Alunos lêem todas as alternativas (necessário para exibir perguntas)
CREATE POLICY "publico_le_alternativas" ON interacoes_alternativas
  FOR SELECT USING (true);

-- Alunos inserem suas próprias respostas
CREATE POLICY "aluno_insere_resposta" ON interacoes_respostas
  FOR INSERT WITH CHECK (true);

-- Alunos lêem respostas (para verificar se já responderam e ver resultados agregados)
CREATE POLICY "aluno_le_respostas" ON interacoes_respostas
  FOR SELECT USING (true);

-- ── Políticas: admin (authenticated via Supabase Auth) ───────────────────────

-- Admin lê TODAS as interações (ativas e inativas)
CREATE POLICY "admin_gerencia_interacoes" ON interacoes
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin gerencia alternativas
CREATE POLICY "admin_gerencia_alternativas" ON interacoes_alternativas
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin gerencia respostas (lê tudo)
CREATE POLICY "admin_gerencia_respostas" ON interacoes_respostas
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_interacoes_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_interacoes_atualizado_em
  BEFORE UPDATE ON interacoes
  FOR EACH ROW EXECUTE FUNCTION update_interacoes_atualizado_em();
