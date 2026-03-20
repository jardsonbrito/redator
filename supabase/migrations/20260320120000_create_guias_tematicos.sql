CREATE TABLE IF NOT EXISTS guias_tematicos (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frase_tematica           text NOT NULL,
  cover_source             text,
  cover_url                text,
  cover_file_path          text,
  comando_tema             text NOT NULL DEFAULT '',
  nucleo_tematico          text NOT NULL DEFAULT '',
  contexto                 text NOT NULL DEFAULT '',
  perguntas_norteadoras    jsonb NOT NULL DEFAULT '[]'::jsonb,
  interpretacao            text NOT NULL DEFAULT '',
  vocabulario              jsonb NOT NULL DEFAULT '[]'::jsonb,
  problematica_central     text NOT NULL DEFAULT '',
  problematicas_associadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  propostas_solucao        jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo                    boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guias_tematicos ENABLE ROW LEVEL SECURITY;

-- Leitura pública para guias ativos (cobre alunos sem Supabase Auth)
CREATE POLICY "guias_tematicos_select_ativos"
  ON guias_tematicos FOR SELECT
  TO public
  USING (ativo = true);

-- Admin (usuário autenticado) tem acesso total
CREATE POLICY "guias_tematicos_admin_all"
  ON guias_tematicos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_guias_tematicos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guias_tematicos_updated_at
  BEFORE UPDATE ON guias_tematicos
  FOR EACH ROW EXECUTE FUNCTION update_guias_tematicos_updated_at();
