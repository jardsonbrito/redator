-- Add text fonte fields and image fields for motivators 1-5 with position fields
-- Note: cover and motivator4 base fields already exist from previous migration
ALTER TABLE public.temas
-- Motivator 1 fields (text source and image)
ADD COLUMN IF NOT EXISTS texto_1_fonte TEXT,
ADD COLUMN IF NOT EXISTS motivator1_source TEXT CHECK (motivator1_source IN ('upload', 'url', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS motivator1_url TEXT,
ADD COLUMN IF NOT EXISTS motivator1_file_path TEXT,
ADD COLUMN IF NOT EXISTS motivator1_file_size INTEGER,
ADD COLUMN IF NOT EXISTS motivator1_dimensions JSONB,
ADD COLUMN IF NOT EXISTS motivator1_image_position TEXT CHECK (motivator1_image_position IN ('before', 'after', 'left', 'right')) DEFAULT 'after',

-- Motivator 2 fields (text source and image)
ADD COLUMN IF NOT EXISTS texto_2_fonte TEXT,
ADD COLUMN IF NOT EXISTS motivator2_source TEXT CHECK (motivator2_source IN ('upload', 'url', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS motivator2_url TEXT,
ADD COLUMN IF NOT EXISTS motivator2_file_path TEXT,
ADD COLUMN IF NOT EXISTS motivator2_file_size INTEGER,
ADD COLUMN IF NOT EXISTS motivator2_dimensions JSONB,
ADD COLUMN IF NOT EXISTS motivator2_image_position TEXT CHECK (motivator2_image_position IN ('before', 'after', 'left', 'right')) DEFAULT 'after',

-- Motivator 3 fields (text source and image)
ADD COLUMN IF NOT EXISTS texto_3_fonte TEXT,
ADD COLUMN IF NOT EXISTS motivator3_source TEXT CHECK (motivator3_source IN ('upload', 'url', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS motivator3_url TEXT,
ADD COLUMN IF NOT EXISTS motivator3_file_path TEXT,
ADD COLUMN IF NOT EXISTS motivator3_file_size INTEGER,
ADD COLUMN IF NOT EXISTS motivator3_dimensions JSONB,
ADD COLUMN IF NOT EXISTS motivator3_image_position TEXT CHECK (motivator3_image_position IN ('before', 'after', 'left', 'right')) DEFAULT 'after',

-- Motivator 4 fields (text, text source and image position)
-- Note: motivator4_source, url, file_path, file_size, dimensions already exist
ADD COLUMN IF NOT EXISTS texto_4 TEXT,
ADD COLUMN IF NOT EXISTS texto_4_fonte TEXT,
ADD COLUMN IF NOT EXISTS motivator4_image_position TEXT CHECK (motivator4_image_position IN ('before', 'after', 'left', 'right')) DEFAULT 'after',

-- Motivator 5 fields (text, text source and image)
ADD COLUMN IF NOT EXISTS texto_5 TEXT,
ADD COLUMN IF NOT EXISTS texto_5_fonte TEXT,
ADD COLUMN IF NOT EXISTS motivator5_source TEXT CHECK (motivator5_source IN ('upload', 'url', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS motivator5_url TEXT,
ADD COLUMN IF NOT EXISTS motivator5_file_path TEXT,
ADD COLUMN IF NOT EXISTS motivator5_file_size INTEGER,
ADD COLUMN IF NOT EXISTS motivator5_dimensions JSONB,
ADD COLUMN IF NOT EXISTS motivator5_image_position TEXT CHECK (motivator5_image_position IN ('before', 'after', 'left', 'right')) DEFAULT 'after';

-- Add comments to document the new fields
COMMENT ON COLUMN public.temas.texto_1_fonte IS 'Fonte/crédito do texto motivador 1 (sempre aparece por último)';
COMMENT ON COLUMN public.temas.texto_2_fonte IS 'Fonte/crédito do texto motivador 2 (sempre aparece por último)';
COMMENT ON COLUMN public.temas.texto_3_fonte IS 'Fonte/crédito do texto motivador 3 (sempre aparece por último)';
COMMENT ON COLUMN public.temas.texto_4 IS 'Texto verbal do motivador 4';
COMMENT ON COLUMN public.temas.texto_4_fonte IS 'Fonte/crédito do texto motivador 4 (sempre aparece por último)';
COMMENT ON COLUMN public.temas.texto_5 IS 'Texto verbal do motivador 5';
COMMENT ON COLUMN public.temas.texto_5_fonte IS 'Fonte/crédito do texto motivador 5 (sempre aparece por último)';
COMMENT ON COLUMN public.temas.motivator1_source IS 'Source of motivator 1 image: upload (file uploaded to storage), url (external URL), or none (no image)';
COMMENT ON COLUMN public.temas.motivator1_image_position IS 'Position of motivator 1 image relative to text: before (above), after (below), left, or right';
COMMENT ON COLUMN public.temas.motivator2_source IS 'Source of motivator 2 image: upload (file uploaded to storage), url (external URL), or none (no image)';
COMMENT ON COLUMN public.temas.motivator2_image_position IS 'Position of motivator 2 image relative to text: before (above), after (below), left, or right';
COMMENT ON COLUMN public.temas.motivator3_source IS 'Source of motivator 3 image: upload (file uploaded to storage), url (external URL), or none (no image)';
COMMENT ON COLUMN public.temas.motivator3_image_position IS 'Position of motivator 3 image relative to text: before (above), after (below), left, or right';
COMMENT ON COLUMN public.temas.motivator4_image_position IS 'Position of motivator 4 image relative to text: before (above), after (below), left, or right';
COMMENT ON COLUMN public.temas.motivator5_source IS 'Source of motivator 5 image: upload (file uploaded to storage), url (external URL), or none (no image)';
COMMENT ON COLUMN public.temas.motivator5_image_position IS 'Position of motivator 5 image relative to text: before (above), after (below), left, or right';

-- Update the function to compute needs_media_update to include all 5 motivators
CREATE OR REPLACE FUNCTION public.compute_needs_media_update(
  p_cover_source text,
  p_cover_url text,
  p_cover_file_path text,
  p_motivator1_source text,
  p_motivator1_url text,
  p_motivator1_file_path text,
  p_motivator2_source text,
  p_motivator2_url text,
  p_motivator2_file_path text,
  p_motivator3_source text,
  p_motivator3_url text,
  p_motivator3_file_path text,
  p_motivator4_source text,
  p_motivator4_url text,
  p_motivator4_file_path text,
  p_motivator5_source text,
  p_motivator5_url text,
  p_motivator5_file_path text
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  placeholder_cover_url text := 'https://kgmxntpmvlnbftjqtyxx.supabase.co/storage/v1/object/public/placeholders/tema-cover.png';
  has_cover boolean;
  has_tm1 boolean;
  has_tm2 boolean;
  has_tm3 boolean;
  has_tm4 boolean;
  has_tm5 boolean;
BEGIN
  -- Check if theme has valid cover image
  has_cover := (
    (p_cover_source = 'upload' AND p_cover_file_path IS NOT NULL AND p_cover_file_path != '') OR
    (p_cover_source = 'url' AND p_cover_url IS NOT NULL AND p_cover_url != '' AND p_cover_url != placeholder_cover_url)
  );

  -- Check each motivator (has valid image or explicitly set to none)
  has_tm1 := (
    (p_motivator1_source = 'upload' AND p_motivator1_file_path IS NOT NULL AND p_motivator1_file_path != '') OR
    (p_motivator1_source = 'url' AND p_motivator1_url IS NOT NULL AND p_motivator1_url != '') OR
    (p_motivator1_source = 'none')
  );

  has_tm2 := (
    (p_motivator2_source = 'upload' AND p_motivator2_file_path IS NOT NULL AND p_motivator2_file_path != '') OR
    (p_motivator2_source = 'url' AND p_motivator2_url IS NOT NULL AND p_motivator2_url != '') OR
    (p_motivator2_source = 'none')
  );

  has_tm3 := (
    (p_motivator3_source = 'upload' AND p_motivator3_file_path IS NOT NULL AND p_motivator3_file_path != '') OR
    (p_motivator3_source = 'url' AND p_motivator3_url IS NOT NULL AND p_motivator3_url != '') OR
    (p_motivator3_source = 'none')
  );

  has_tm4 := (
    (p_motivator4_source = 'upload' AND p_motivator4_file_path IS NOT NULL AND p_motivator4_file_path != '') OR
    (p_motivator4_source = 'url' AND p_motivator4_url IS NOT NULL AND p_motivator4_url != '') OR
    (p_motivator4_source = 'none')
  );

  has_tm5 := (
    (p_motivator5_source = 'upload' AND p_motivator5_file_path IS NOT NULL AND p_motivator5_file_path != '') OR
    (p_motivator5_source = 'url' AND p_motivator5_url IS NOT NULL AND p_motivator5_url != '') OR
    (p_motivator5_source = 'none')
  );

  -- Theme needs media update if it lacks cover or any motivator
  RETURN NOT (has_cover AND has_tm1 AND has_tm2 AND has_tm3 AND has_tm4 AND has_tm5);
END;
$$;

-- Update trigger function to pass all motivator parameters
CREATE OR REPLACE FUNCTION public.update_needs_media_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.needs_media_update := public.compute_needs_media_update(
    NEW.cover_source,
    NEW.cover_url,
    NEW.cover_file_path,
    NEW.motivator1_source,
    NEW.motivator1_url,
    NEW.motivator1_file_path,
    NEW.motivator2_source,
    NEW.motivator2_url,
    NEW.motivator2_file_path,
    NEW.motivator3_source,
    NEW.motivator3_url,
    NEW.motivator3_file_path,
    NEW.motivator4_source,
    NEW.motivator4_url,
    NEW.motivator4_file_path,
    NEW.motivator5_source,
    NEW.motivator5_url,
    NEW.motivator5_file_path
  );

  RETURN NEW;
END;
$$;

-- Migration: Fix all existing themes with correct needs_media_update values
UPDATE public.temas
SET needs_media_update = public.compute_needs_media_update(
  cover_source,
  cover_url,
  cover_file_path,
  motivator1_source,
  motivator1_url,
  motivator1_file_path,
  motivator2_source,
  motivator2_url,
  motivator2_file_path,
  motivator3_source,
  motivator3_url,
  motivator3_file_path,
  motivator4_source,
  motivator4_url,
  motivator4_file_path,
  motivator5_source,
  motivator5_url,
  motivator5_file_path
);
