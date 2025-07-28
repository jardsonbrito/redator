-- Policies para o bucket avatars (verificar se já existem antes)

-- Policy para permitir upload de avatars (usuários autenticados)
CREATE POLICY "Usuários podem fazer upload de avatars" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars');

-- Policy para permitir leitura de avatars (público)
CREATE POLICY "Todos podem ver avatars" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'avatars');

-- Policy para permitir atualização de avatars (usuários autenticados)  
CREATE POLICY "Usuários podem atualizar seus avatars" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'avatars');

-- Policy para permitir exclusão de avatars (usuários autenticados)
CREATE POLICY "Usuários podem deletar seus avatars" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'avatars');