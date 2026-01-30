-- Adicionar campos de capa na tabela videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS cover_source TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS cover_file_path TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS cover_file_size INTEGER;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS cover_dimensions JSONB;

-- Criar bucket para capas de vídeos da videoteca
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de acesso ao bucket videos

-- Qualquer pessoa pode visualizar as capas de vídeos (são públicas)
CREATE POLICY "Video covers are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos');

-- Admins podem fazer upload de capas de vídeos
CREATE POLICY "Admins can upload video covers"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'videos' AND public.is_main_admin());

-- Admins podem atualizar capas de vídeos
CREATE POLICY "Admins can update video covers"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'videos' AND public.is_main_admin());

-- Admins podem deletar capas de vídeos
CREATE POLICY "Admins can delete video covers"
ON storage.objects
FOR DELETE
USING (bucket_id = 'videos' AND public.is_main_admin());

-- Comentário: Os campos cover_source podem ter valores:
-- 'youtube' = thumbnail automática do YouTube
-- 'url' = URL externa fornecida pelo admin
-- 'upload' = imagem enviada pelo admin para o bucket
