-- Tabela para armazenar o vídeo de instrução exibido para professores
CREATE TABLE IF NOT EXISTS public.jarvis_video_instrucao (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      text        NOT NULL DEFAULT 'Como usar o Jarvis Corretor',
  url_youtube text        NOT NULL DEFAULT '',
  ativo       boolean     NOT NULL DEFAULT true,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Linha inicial (URL vazia — admin preencherá via painel)
INSERT INTO public.jarvis_video_instrucao (titulo, url_youtube, ativo)
VALUES ('Como usar o Jarvis Corretor', '', true)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.jarvis_video_instrucao ENABLE ROW LEVEL SECURITY;

-- Professores (anon key) podem ler
CREATE POLICY "leitura_publica_video_instrucao"
  ON public.jarvis_video_instrucao
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin (authenticated) pode editar
CREATE POLICY "admin_editar_video_instrucao"
  ON public.jarvis_video_instrucao
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
