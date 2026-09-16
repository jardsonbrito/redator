-- Adiciona campos de imagem de capa às redações comentadas
ALTER TABLE public.redacoes_comentadas
  ADD COLUMN IF NOT EXISTS capa_source    text,
  ADD COLUMN IF NOT EXISTS capa_url       text,
  ADD COLUMN IF NOT EXISTS capa_file_path text;
