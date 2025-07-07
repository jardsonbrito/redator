-- Criar políticas para bucket redacoes-manuscritas
CREATE POLICY "Anyone can upload to redacoes-manuscritas" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'redacoes-manuscritas');

CREATE POLICY "Anyone can view redacoes-manuscritas" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'redacoes-manuscritas');

CREATE POLICY "Anyone can update redacoes-manuscritas" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'redacoes-manuscritas');

CREATE POLICY "Anyone can delete redacoes-manuscritas" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'redacoes-manuscritas');