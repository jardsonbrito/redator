-- Corrigir problema de downloads da biblioteca
-- 1. Tornar o bucket biblioteca-pdfs público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'biblioteca-pdfs';

-- 2. Remover políticas existentes duplicadas se existirem
DROP POLICY IF EXISTS "Permitir acesso público para download de PDFs da biblioteca" ON storage.objects;
DROP POLICY IF EXISTS "Acesso público completo para PDFs da biblioteca" ON storage.objects;

-- 3. Criar política para acesso público de leitura
CREATE POLICY "Public download biblioteca PDFs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'biblioteca-pdfs');