-- Migration: Fix August simulado cover image
-- Corrige o problema da imagem cidadania-01.jpg do simulado de agosto que retorna erro 503

-- Primeiro, identificar o tema que está causando problema
-- e substituir a referência por uma URL externa válida

UPDATE public.temas
SET
  cover_source = 'url',
  cover_url = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=1226&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  cover_file_path = NULL
WHERE cover_file_path = 'cidadania-01.jpg';

-- Alternativamente, se preferir usar uma imagem já existente no bucket:
-- UPDATE public.temas
-- SET cover_file_path = 'nome-de-imagem-existente.jpg'
-- WHERE cover_file_path = 'cidadania-01.jpg';

-- Log da operação
DO $$
BEGIN
  RAISE NOTICE 'Corrigido tema com imagem cidadania-01.jpg - substituído por URL externa válida';
END $$;