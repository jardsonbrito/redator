-- Add optional cover fields to aulas
ALTER TABLE public.aulas
ADD COLUMN IF NOT EXISTS cover_source text,
ADD COLUMN IF NOT EXISTS cover_file_path text,
ADD COLUMN IF NOT EXISTS cover_url text;

-- Create storage bucket for aulas covers (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('aulas', 'aulas', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for aula covers
CREATE POLICY IF NOT EXISTS "Public can view aula covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'aulas');

CREATE POLICY IF NOT EXISTS "Anyone can upload aula covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'aulas');

CREATE POLICY IF NOT EXISTS "Anyone can update aula covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'aulas');