-- Add optional cover fields to aulas
ALTER TABLE public.aulas
ADD COLUMN IF NOT EXISTS cover_source text,
ADD COLUMN IF NOT EXISTS cover_file_path text,
ADD COLUMN IF NOT EXISTS cover_url text;

-- Create storage bucket for aulas covers (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('aulas', 'aulas', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public can view aula covers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can view aula covers'
  ) THEN
    CREATE POLICY "Public can view aula covers"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'aulas');
  END IF;
END $$;

-- Policy: Anyone can upload aula covers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can upload aula covers'
  ) THEN
    CREATE POLICY "Anyone can upload aula covers"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'aulas');
  END IF;
END $$;

-- Policy: Anyone can update aula covers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can update aula covers'
  ) THEN
    CREATE POLICY "Anyone can update aula covers"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'aulas');
  END IF;
END $$;