-- Tabela para comentários de trecho em redações (pré-correção Jarvis + corretor humano)
-- Diferente das Redações Comentadas (conteúdo editorial), esta tabela é por correção individual

CREATE TABLE comentarios_trecho_correcao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redacao_enviada_id UUID NOT NULL REFERENCES redacoes_enviadas(id) ON DELETE CASCADE,
  jarvis_correcao_id UUID REFERENCES jarvis_correcoes(id) ON DELETE SET NULL,
  trecho TEXT NOT NULL,
  inicio INT NOT NULL,
  fim INT NOT NULL,
  contexto_anterior TEXT,
  contexto_posterior TEXT,
  ocorrencia INT NOT NULL DEFAULT 1,
  competencia TEXT NOT NULL,
  tipo TEXT,
  comentario TEXT NOT NULL,
  sugestao_reescrita TEXT,
  origem TEXT NOT NULL DEFAULT 'corretor' CHECK (origem IN ('jarvis', 'corretor')),
  status TEXT NOT NULL DEFAULT 'sugerida' CHECK (status IN ('sugerida', 'confirmada', 'ignorada')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ctc_redacao_enviada ON comentarios_trecho_correcao(redacao_enviada_id);
CREATE INDEX idx_ctc_jarvis_correcao ON comentarios_trecho_correcao(jarvis_correcao_id);
CREATE INDEX idx_ctc_status ON comentarios_trecho_correcao(status);
CREATE INDEX idx_ctc_origem ON comentarios_trecho_correcao(origem);

ALTER TABLE comentarios_trecho_correcao ENABLE ROW LEVEL SECURITY;

-- Admins: acesso total
CREATE POLICY "admins_all_comentarios_trecho" ON comentarios_trecho_correcao
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Corretores: leitura das redações atribuídas a eles; escrita de seus próprios comentários
CREATE POLICY "corretores_select_comentarios_trecho" ON comentarios_trecho_correcao
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM redacoes_enviadas re
      JOIN corretores c ON (re.corretor_id_1 = c.id OR re.corretor_id_2 = c.id)
      WHERE re.id = comentarios_trecho_correcao.redacao_enviada_id
        AND c.id = auth.uid()
    )
  );

CREATE POLICY "corretores_insert_comentarios_trecho" ON comentarios_trecho_correcao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    origem = 'corretor'
    AND EXISTS (
      SELECT 1 FROM redacoes_enviadas re
      JOIN corretores c ON (re.corretor_id_1 = c.id OR re.corretor_id_2 = c.id)
      WHERE re.id = comentarios_trecho_correcao.redacao_enviada_id
        AND c.id = auth.uid()
    )
  );

CREATE POLICY "corretores_update_comentarios_trecho" ON comentarios_trecho_correcao
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM redacoes_enviadas re
      JOIN corretores c ON (re.corretor_id_1 = c.id OR re.corretor_id_2 = c.id)
      WHERE re.id = comentarios_trecho_correcao.redacao_enviada_id
        AND c.id = auth.uid()
    )
  );

-- Service role: acesso irrestrito (usado pelas edge functions)
CREATE POLICY "service_role_all_comentarios_trecho" ON comentarios_trecho_correcao
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_comentarios_trecho_correcao_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ctc_atualizado_em
  BEFORE UPDATE ON comentarios_trecho_correcao
  FOR EACH ROW
  EXECUTE FUNCTION update_comentarios_trecho_correcao_atualizado_em();
