-- =====================================================
-- MIGRATION: Create exercises storage bucket
-- Description: Creates storage bucket for exercise cover images
-- Date: 2025-10-08
-- =====================================================

-- Create the exercises bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercises',
  'exercises',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES for exercises bucket
-- =====================================================

-- Policy 1: Public read access (anyone can view exercise covers)
CREATE POLICY IF NOT EXISTS "Public read access for exercise covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exercises');

-- Policy 2: Admin users can upload exercise covers
CREATE POLICY IF NOT EXISTS "Admins can upload exercise covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercises'
  AND (
    -- Check if user is admin
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND ativo = true
    )
    OR
    -- Fallback for hardcoded admin emails
    (auth.jwt() ->> 'email') IN (
      'jardsonbrito@gmail.com',
      'jarvisluz@gmail.com'
    )
  )
);

-- Policy 3: Admin users can update exercise covers
CREATE POLICY IF NOT EXISTS "Admins can update exercise covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exercises'
  AND (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND ativo = true
    )
    OR
    (auth.jwt() ->> 'email') IN (
      'jardsonbrito@gmail.com',
      'jarvisluz@gmail.com'
    )
  )
);

-- Policy 4: Admin users can delete exercise covers
CREATE POLICY IF NOT EXISTS "Admins can delete exercise covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercises'
  AND (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND ativo = true
    )
    OR
    (auth.jwt() ->> 'email') IN (
      'jardsonbrito@gmail.com',
      'jarvisluz@gmail.com'
    )
  )
);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Verify bucket creation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'exercises') THEN
    RAISE NOTICE 'SUCCESS: Exercises bucket created successfully';
  ELSE
    RAISE EXCEPTION 'ERROR: Failed to create exercises bucket';
  END IF;
END $$;
