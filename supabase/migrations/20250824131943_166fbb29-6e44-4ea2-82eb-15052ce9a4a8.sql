-- Verificar se o bucket biblioteca-pdfs existe e criar se necessário
INSERT INTO storage.buckets (id, name, public)
VALUES ('biblioteca-pdfs', 'biblioteca-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir visualização pública dos arquivos da biblioteca
CREATE POLICY IF NOT EXISTS "Public can view biblioteca files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'biblioteca-pdfs');

-- Política para permitir admin inserir arquivos
CREATE POLICY IF NOT EXISTS "Admin can upload biblioteca files"
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
CREATE POLICY IF NOT EXISTS "Admin can update biblioteca files"
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
CREATE POLICY IF NOT EXISTS "Admin can delete biblioteca files"
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