-- Criar bucket para imagens do inbox
INSERT INTO storage.buckets (id, name, public)
VALUES ('inbox-images', 'inbox-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket inbox-images
-- Permitir upload apenas para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inbox-images');

-- Permitir leitura pública
CREATE POLICY "Qualquer um pode visualizar imagens"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inbox-images');

-- Permitir que usuários autenticados deletem suas próprias imagens
CREATE POLICY "Usuários autenticados podem deletar imagens"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inbox-images');
