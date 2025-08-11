-- Add new fields to temas table for cover image and motivator 4
ALTER TABLE public.temas 
ADD COLUMN cover_source TEXT CHECK (cover_source IN ('upload', 'url')) NOT NULL DEFAULT 'url',
ADD COLUMN cover_url TEXT,
ADD COLUMN cover_file_path TEXT,
ADD COLUMN cover_file_size INTEGER,
ADD COLUMN cover_dimensions JSONB,
ADD COLUMN motivator4_source TEXT CHECK (motivator4_source IN ('upload', 'url', 'none')) DEFAULT 'none',
ADD COLUMN motivator4_url TEXT,
ADD COLUMN motivator4_file_path TEXT,
ADD COLUMN motivator4_file_size INTEGER,
ADD COLUMN motivator4_dimensions JSONB;

-- Migrate existing data: copy imagem_texto_4_url to cover_url
UPDATE public.temas 
SET 
  cover_source = 'url',
  cover_url = imagem_texto_4_url
WHERE imagem_texto_4_url IS NOT NULL AND imagem_texto_4_url != '';

-- Create storage bucket for theme images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('themes', 'themes', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for theme images storage
CREATE POLICY "Admin can upload theme images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'themes' AND auth.email() = 'jardsonbrito@gmail.com');

CREATE POLICY "Admin can update theme images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'themes' AND auth.email() = 'jardsonbrito@gmail.com');

CREATE POLICY "Admin can delete theme images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'themes' AND auth.email() = 'jardsonbrito@gmail.com');

CREATE POLICY "Public can view theme images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'themes');