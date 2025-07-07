-- Criar políticas de storage para permitir upload de redações manuscritas

-- Política para permitir qualquer pessoa fazer upload de redações manuscritas
CREATE POLICY "Allow public uploads to redacoes-manuscritas folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'biblioteca-pdfs' AND (storage.foldername(name))[1] = 'redacoes-manuscritas');

-- Política para permitir visualização pública das imagens enviadas
CREATE POLICY "Allow public read access to redacoes-manuscritas folder" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'biblioteca-pdfs' AND (storage.foldername(name))[1] = 'redacoes-manuscritas');

-- Política para permitir atualização de redações manuscritas
CREATE POLICY "Allow public update to redacoes-manuscritas folder" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'biblioteca-pdfs' AND (storage.foldername(name))[1] = 'redacoes-manuscritas');