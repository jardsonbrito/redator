-- Criar políticas RLS para o Storage - tabela objects
-- Permitir inserção de arquivos no bucket audios-corretores

-- Política para permitir inserção (upload) de arquivos
CREATE POLICY "Usuários autenticados podem fazer upload no bucket audios-corretores"
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audios-corretores');

-- Política para permitir leitura de arquivos
CREATE POLICY "Todos podem ler arquivos do bucket audios-corretores"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audios-corretores');

-- Política para permitir atualização de arquivos
CREATE POLICY "Usuários autenticados podem atualizar arquivos no bucket audios-corretores"
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audios-corretores')
WITH CHECK (bucket_id = 'audios-corretores');

-- Política para permitir exclusão de arquivos
CREATE POLICY "Usuários autenticados podem deletar arquivos no bucket audios-corretores"
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audios-corretores');