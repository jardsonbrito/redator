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

-- Permitir que qualquer um delete imagens (necessário porque admin não usa auth)
CREATE POLICY "Permitir deletar imagens do inbox"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'inbox-images');
