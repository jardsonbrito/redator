-- Function to compute needs_media_update based on actual media fields
CREATE OR REPLACE FUNCTION public.compute_needs_media_update(
  p_cover_source text,
  p_cover_url text,
  p_cover_file_path text,
  p_motivator4_source text,
  p_motivator4_url text,
  p_motivator4_file_path text
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  placeholder_cover_url text := 'https://kgmxntpmvlnbftjqtyxx.supabase.co/storage/v1/object/public/placeholders/tema-cover.png';
  placeholder_tm4_url text := 'https://kgmxntpmvlnbftjqtyxx.supabase.co/storage/v1/object/public/placeholders/motivador4.png';
  has_cover boolean;
  has_tm4 boolean;
BEGIN
  -- Check if theme has valid cover image
  has_cover := (
    (p_cover_source = 'upload' AND p_cover_file_path IS NOT NULL AND p_cover_file_path != '') OR
    (p_cover_source = 'url' AND p_cover_url IS NOT NULL AND p_cover_url != '' AND p_cover_url != placeholder_cover_url)
  );
  
  -- Check if theme has valid motivator IV or explicitly set to none
  has_tm4 := (
    (p_motivator4_source = 'upload' AND p_motivator4_file_path IS NOT NULL AND p_motivator4_file_path != '') OR
    (p_motivator4_source = 'url' AND p_motivator4_url IS NOT NULL AND p_motivator4_url != '' AND p_motivator4_url != placeholder_tm4_url) OR
    (p_motivator4_source = 'none')
  );
  
  -- Theme needs media update if it lacks either cover or TM4
  RETURN NOT (has_cover AND has_tm4);
END;
$$;

-- Trigger function to automatically compute needs_media_update
CREATE OR REPLACE FUNCTION public.update_needs_media_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.needs_media_update := public.compute_needs_media_update(
    NEW.cover_source,
    NEW.cover_url,
    NEW.cover_file_path,
    NEW.motivator4_source,
    NEW.motivator4_url,
    NEW.motivator4_file_path
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update needs_media_update on INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_update_needs_media_update ON public.temas;
CREATE TRIGGER trigger_update_needs_media_update
  BEFORE INSERT OR UPDATE ON public.temas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_needs_media_update();

-- Migration: Fix all existing themes with correct needs_media_update values
UPDATE public.temas 
SET needs_media_update = public.compute_needs_media_update(
  cover_source,
  cover_url,
  cover_file_path,
  motivator4_source,
  motivator4_url,
  motivator4_file_path
);

-- Add index for better performance on needs_media_update queries
CREATE INDEX IF NOT EXISTS idx_temas_needs_media_update ON public.temas(needs_media_update) WHERE needs_media_update = true;