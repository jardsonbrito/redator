-- Add needs_media_update field to temas table
ALTER TABLE temas ADD COLUMN IF NOT EXISTS needs_media_update BOOLEAN DEFAULT FALSE;

-- Create placeholder storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('placeholders', 'placeholders', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for placeholders bucket (public read)
CREATE POLICY "Public can view placeholders" ON storage.objects
FOR SELECT USING (bucket_id = 'placeholders');

-- Allow admin to manage placeholders
CREATE POLICY "Admin can manage placeholders" ON storage.objects
FOR ALL TO public
USING (bucket_id = 'placeholders' AND is_main_admin())
WITH CHECK (bucket_id = 'placeholders' AND is_main_admin());