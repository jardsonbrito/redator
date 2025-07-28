-- Corrigir policies do bucket avatars para permitir acesso anônimo

-- Remover policies antigas que só permitiam usuários autenticados
DROP POLICY IF EXISTS "Usuários podem fazer upload de avatars" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver avatars" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus avatars" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus avatars" ON storage.objects;

-- Criar novas policies que permitem acesso anônimo
CREATE POLICY "Qualquer um pode fazer upload de avatars" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Qualquer um pode ver avatars" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'avatars');

CREATE POLICY "Qualquer um pode atualizar avatars" 
ON storage.objects 
FOR UPDATE 
TO public 
USING (bucket_id = 'avatars');

CREATE POLICY "Qualquer um pode deletar avatars" 
ON storage.objects 
FOR DELETE 
TO public 
USING (bucket_id = 'avatars');