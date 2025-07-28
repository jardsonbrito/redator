-- Adicionar campo audio_url às tabelas de redações para gravações dos corretores
ALTER TABLE public.redacoes_enviadas ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL;
ALTER TABLE public.redacoes_simulado ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL;
ALTER TABLE public.redacoes_exercicio ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL;

-- Criar bucket para áudios dos corretores se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audios-corretores', 
  'audios-corretores', 
  true, 
  5242880, -- 5MB limit
  ARRAY['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp3']
) ON CONFLICT (id) DO NOTHING;

-- Criar políticas para o bucket de áudios dos corretores
INSERT INTO storage.policies (id, bucket_id, command, name, definition)
VALUES 
  (
    'audios-corretores-select',
    'audios-corretores',
    'SELECT',
    'Anyone can view audio files',
    'true'
  ),
  (
    'audios-corretores-insert',
    'audios-corretores', 
    'INSERT',
    'Authenticated users can upload audio files',
    'true'
  ),
  (
    'audios-corretores-update',
    'audios-corretores',
    'UPDATE', 
    'Authenticated users can update audio files',
    'true'
  ),
  (
    'audios-corretores-delete',
    'audios-corretores',
    'DELETE',
    'Authenticated users can delete audio files', 
    'true'
  )
ON CONFLICT (id) DO NOTHING;