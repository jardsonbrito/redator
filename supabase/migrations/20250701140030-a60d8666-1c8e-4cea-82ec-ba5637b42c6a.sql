-- Create storage bucket for aula PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('aula-pdfs', 'aula-pdfs', true);

-- Create policy for public read access to aula PDFs
CREATE POLICY "Aula PDFs are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'aula-pdfs');

-- Create policy for admin upload of aula PDFs
CREATE POLICY "Admins can upload aula PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'aula-pdfs' AND is_main_admin());

-- Create policy for admin update of aula PDFs
CREATE POLICY "Admins can update aula PDFs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'aula-pdfs' AND is_main_admin());

-- Create policy for admin delete of aula PDFs
CREATE POLICY "Admins can delete aula PDFs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'aula-pdfs' AND is_main_admin());