-- Verificar se o bucket biblioteca-pdfs existe e criar se necessário
INSERT INTO storage.buckets (id, name, public)
VALUES ('biblioteca-pdfs', 'biblioteca-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Public can view biblioteca files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload biblioteca files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update biblioteca files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete biblioteca files" ON storage.objects;

-- Política para permitir visualização pública dos arquivos da biblioteca
CREATE POLICY "Public can view biblioteca files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'biblioteca-pdfs');

-- Política para permitir admin inserir arquivos
CREATE POLICY "Admin can upload biblioteca files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'biblioteca-pdfs' 
  AND (
    is_main_admin() 
    OR EXISTS (
      SELECT 1 FROM public.professores 
      WHERE email = auth.email() AND ativo = true
    )
  )
);

-- Política para permitir admin atualizar arquivos
CREATE POLICY "Admin can update biblioteca files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'biblioteca-pdfs' 
  AND (
    is_main_admin() 
    OR EXISTS (
      SELECT 1 FROM public.professores 
      WHERE email = auth.email() AND ativo = true
    )
  )
);

-- Política para permitir admin deletar arquivos
CREATE POLICY "Admin can delete biblioteca files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'biblioteca-pdfs' 
  AND (
    is_main_admin() 
    OR EXISTS (
      SELECT 1 FROM public.professores 
      WHERE email = auth.email() AND ativo = true
    )
  )
);