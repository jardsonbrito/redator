-- Corrigir problema de downloads da biblioteca
-- 1. Tornar o bucket biblioteca-pdfs público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'biblioteca-pdfs';

-- 2. Garantir que existam políticas adequadas para acesso público aos PDFs
-- Política para visualização pública (SELECT)
CREATE POLICY IF NOT EXISTS "Permitir acesso público para download de PDFs da biblioteca" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'biblioteca-pdfs');

-- 3. Política para download/leitura pública dos arquivos
CREATE POLICY IF NOT EXISTS "Acesso público completo para PDFs da biblioteca" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'biblioteca-pdfs');