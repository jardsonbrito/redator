-- Add text field for motivator 4 and image fields for all motivators with position fields
ALTER TABLE public.temas
-- Motivator 1 image fields
ADD COLUMN motivator1_source TEXT CHECK (motivator1_source IN ('upload', 'url', 'none')) DEFAULT 'none',
ADD COLUMN motivator1_url TEXT,
ADD COLUMN motivator1_file_path TEXT,
ADD COLUMN motivator1_file_size INTEGER,
ADD COLUMN motivator1_dimensions JSONB,
ADD COLUMN motivator1_image_position TEXT CHECK (motivator1_image_position IN ('before', 'after', 'left', 'right')) DEFAULT 'after',

-- Motivator 2 image fields
ADD COLUMN motivator2_source TEXT CHECK (motivator2_source IN ('upload', 'url', 'none')) DEFAULT 'none',
ADD COLUMN motivator2_url TEXT,
ADD COLUMN motivator2_file_path TEXT,
ADD COLUMN motivator2_file_size INTEGER,
ADD COLUMN motivator2_dimensions JSONB,
ADD COLUMN motivator2_image_position TEXT CHECK (motivator2_image_position IN ('before', 'after', 'left', 'right')) DEFAULT 'after',

-- Motivator 3 image fields
ADD COLUMN motivator3_source TEXT CHECK (motivator3_source IN ('upload', 'url', 'none')) DEFAULT 'none',
ADD COLUMN motivator3_url TEXT,
ADD COLUMN motivator3_file_path TEXT,
ADD COLUMN motivator3_file_size INTEGER,
ADD COLUMN motivator3_dimensions JSONB,
ADD COLUMN motivator3_image_position TEXT CHECK (motivator3_image_position IN ('before', 'after', 'left', 'right')) DEFAULT 'after',

-- Motivator 4 text and image position (image fields already exist)
ADD COLUMN texto_4 TEXT,
ADD COLUMN motivator4_image_position TEXT CHECK (motivator4_image_position IN ('before', 'after', 'left', 'right')) DEFAULT 'after',

-- Motivator 5 image fields
ADD COLUMN motivator5_source TEXT CHECK (motivator5_source IN ('upload', 'url', 'none')) DEFAULT 'none',
ADD COLUMN motivator5_url TEXT,
ADD COLUMN motivator5_file_path TEXT,
ADD COLUMN motivator5_file_size INTEGER,
ADD COLUMN motivator5_dimensions JSONB,
ADD COLUMN motivator5_image_position TEXT CHECK (motivator5_image_position IN ('before', 'after', 'left', 'right')) DEFAULT 'after';

-- Add comments to document the new fields
COMMENT ON COLUMN public.temas.texto_4 IS 'Texto verbal do motivador 4';
COMMENT ON COLUMN public.temas.motivator1_source IS 'Source of motivator 1 image: upload (file uploaded to storage), url (external URL), or none (no image)';
COMMENT ON COLUMN public.temas.motivator1_image_position IS 'Position of motivator 1 image relative to text: before (above), after (below), left, or right';
COMMENT ON COLUMN public.temas.motivator2_source IS 'Source of motivator 2 image: upload (file uploaded to storage), url (external URL), or none (no image)';
COMMENT ON COLUMN public.temas.motivator2_image_position IS 'Position of motivator 2 image relative to text: before (above), after (below), left, or right';
COMMENT ON COLUMN public.temas.motivator3_source IS 'Source of motivator 3 image: upload (file uploaded to storage), url (external URL), or none (no image)';
COMMENT ON COLUMN public.temas.motivator3_image_position IS 'Position of motivator 3 image relative to text: before (above), after (below), left, or right';
COMMENT ON COLUMN public.temas.motivator4_image_position IS 'Position of motivator 4 image relative to text: before (above), after (below), left, or right';
COMMENT ON COLUMN public.temas.motivator5_source IS 'Source of motivator 5 image: upload (file uploaded to storage), url (external URL), or none (no image)';
COMMENT ON COLUMN public.temas.motivator5_image_position IS 'Position of motivator 5 image relative to text: before (above), after (below), left, or right';
