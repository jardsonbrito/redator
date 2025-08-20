-- Criar bucket para imagens renderizadas de redações
INSERT INTO storage.buckets (id, name, public) 
VALUES ('essay-renders', 'essay-renders', true)
ON CONFLICT (id) DO NOTHING;

-- Política para visualização pública das imagens renderizadas
CREATE POLICY IF NOT EXISTS "Public access to essay renders" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'essay-renders');

-- Política para corretor/admin fazer upload das imagens renderizadas
CREATE POLICY IF NOT EXISTS "Corretor can upload essay renders" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'essay-renders' AND
  (is_main_admin() OR EXISTS (
    SELECT 1 FROM corretores c 
    WHERE c.email = auth.email() AND c.ativo = true
  ))
);