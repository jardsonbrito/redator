-- Adicionar campos para controle de visibilidade por período na biblioteca_materiais
ALTER TABLE public.biblioteca_materiais 
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS unpublished_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS thumbnail_url text DEFAULT NULL;

-- Atualizar materiais existentes para ter published_at baseado em data_publicacao
UPDATE public.biblioteca_materiais 
SET published_at = data_publicacao 
WHERE published_at IS NULL AND data_publicacao IS NOT NULL;

-- Comentário: Adicionados campos para controle de visibilidade temporal e thumbnail dos materiais