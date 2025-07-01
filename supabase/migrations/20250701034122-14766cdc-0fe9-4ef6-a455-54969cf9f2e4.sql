
-- Remover políticas existentes se houverem
DROP POLICY IF EXISTS "Public can view published materials" ON public.biblioteca_materiais;
DROP POLICY IF EXISTS "Main admin can manage all materials" ON public.biblioteca_materiais;

-- Habilitar RLS na tabela
ALTER TABLE public.biblioteca_materiais ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público aos materiais publicados
CREATE POLICY "Public can view published materials" 
ON public.biblioteca_materiais 
FOR SELECT 
USING (status = 'publicado');

-- Políticas para admins
CREATE POLICY "Main admin can manage all materials" 
ON public.biblioteca_materiais 
FOR ALL 
TO authenticated
USING (public.is_main_admin())
WITH CHECK (public.is_main_admin());

-- Políticas de storage mais simples e funcionais
DROP POLICY IF EXISTS "Public can view biblioteca PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view biblioteca PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload biblioteca PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update biblioteca PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete biblioteca PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload biblioteca PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update biblioteca PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete biblioteca PDFs" ON storage.objects;

CREATE POLICY "Public can view biblioteca PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'biblioteca-pdfs');

CREATE POLICY "Authenticated users can upload biblioteca PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'biblioteca-pdfs');

CREATE POLICY "Authenticated users can update biblioteca PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'biblioteca-pdfs');

CREATE POLICY "Authenticated users can delete biblioteca PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'biblioteca-pdfs');
