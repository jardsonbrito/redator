-- Add scheduling columns to temas table
ALTER TABLE public.temas ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ NULL;
ALTER TABLE public.temas ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL;
ALTER TABLE public.temas ADD COLUMN IF NOT EXISTS scheduled_by UUID NULL;

-- Create index for scheduled themes that need to be published
CREATE INDEX IF NOT EXISTS idx_temas_scheduled_due
  ON public.temas (scheduled_publish_at)
  WHERE status = 'rascunho' AND scheduled_publish_at IS NOT NULL;

-- Create index for published themes
CREATE INDEX IF NOT EXISTS idx_temas_published_at
  ON public.temas (published_at)
  WHERE published_at IS NOT NULL;

-- Update existing published themes to have published_at set
UPDATE public.temas 
SET published_at = publicado_em 
WHERE status = 'publicado' AND published_at IS NULL;