-- Tabela para tokens de compartilhamento público de correções do Jarvis
-- Permite que professores compartilhem correções com alunos sem exigir login

CREATE TABLE public.jarvis_correcao_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correcao_id UUID NOT NULL REFERENCES jarvis_correcoes(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES professores(id),
  -- Token de 32 bytes em hex (64 chars) - extremamente difícil de adivinhar
  token      TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  ativo      BOOLEAN NOT NULL DEFAULT true,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em  TIMESTAMPTZ NULL,
  acessos    INTEGER NOT NULL DEFAULT 0,
  ultimo_acesso_em TIMESTAMPTZ NULL
);

CREATE INDEX idx_jarvis_correcao_links_correcao   ON jarvis_correcao_links(correcao_id);
CREATE INDEX idx_jarvis_correcao_links_professor  ON jarvis_correcao_links(professor_id);
CREATE INDEX idx_jarvis_correcao_links_token      ON jarvis_correcao_links(token);

ALTER TABLE jarvis_correcao_links ENABLE ROW LEVEL SECURITY;

-- SELECT público: necessário para visualização do link sem login (anon key)
CREATE POLICY "Leitura pública de links"
  ON jarvis_correcao_links FOR SELECT
  USING (true);

-- INSERT livre: professores não têm auth.uid(), controle feito no frontend
CREATE POLICY "Inserção livre de links"
  ON jarvis_correcao_links FOR INSERT
  WITH CHECK (true);

-- UPDATE livre: para desativar link pelo professor
CREATE POLICY "Atualização livre de links"
  ON jarvis_correcao_links FOR UPDATE
  USING (true);

COMMENT ON TABLE jarvis_correcao_links IS
  'Tokens de compartilhamento público de correções do Jarvis - visualização sem login';
COMMENT ON COLUMN jarvis_correcao_links.token IS
  '32 bytes aleatórios em hex (64 chars) - impossível de adivinhar por força bruta';
COMMENT ON COLUMN jarvis_correcao_links.ativo IS
  'false = link desativado pelo professor, página pública exibe mensagem de indisponível';
