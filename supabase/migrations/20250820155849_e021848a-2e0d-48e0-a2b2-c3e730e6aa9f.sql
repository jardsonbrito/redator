-- Adicionar campos para armazenar a imagem renderizada das redações
ALTER TABLE public.redacoes_enviadas 
ADD COLUMN IF NOT EXISTS image_path TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.redacoes_simulado 
ADD COLUMN IF NOT EXISTS image_path TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.redacoes_exercicio 
ADD COLUMN IF NOT EXISTS image_path TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Criar bucket para armazenar as imagens das redações renderizadas
INSERT INTO storage.buckets (id, name, public)
VALUES ('essays', 'essays', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de acesso para o bucket essays
CREATE POLICY "Allow public access to essays"
ON storage.objects FOR SELECT
USING (bucket_id = 'essays');

CREATE POLICY "Allow service role to insert essays"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'essays');

CREATE POLICY "Allow service role to update essays"
ON storage.objects FOR UPDATE
USING (bucket_id = 'essays');

CREATE POLICY "Allow service role to delete essays"
ON storage.objects FOR DELETE
USING (bucket_id = 'essays');