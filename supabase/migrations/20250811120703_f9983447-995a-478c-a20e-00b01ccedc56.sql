-- Adicionar novas colunas para padronização de vídeos
ALTER TABLE videos ADD COLUMN IF NOT EXISTS eixo_tematico text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS status_publicacao text DEFAULT 'publicado';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_url_original text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_id text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS embed_url text;

-- Copiar categoria antiga para eixo_tematico (se existir)
UPDATE videos
SET eixo_tematico = COALESCE(eixo_tematico, categoria)
WHERE eixo_tematico IS NULL;

-- Backfill dos vídeos existentes - YouTube
UPDATE videos v SET
  platform = 'youtube',
  video_url_original = COALESCE(v.video_url_original, v.youtube_url),
  video_id = COALESCE(
    (regexp_match(v.youtube_url, 'youtu\.be/([A-Za-z0-9_-]{11})'))[1],
    (regexp_match(v.youtube_url, 'v=([A-Za-z0-9_-]{11})'))[1],
    (regexp_match(v.youtube_url, 'shorts/([A-Za-z0-9_-]{11})'))[1],
    (regexp_match(v.youtube_url, 'embed/([A-Za-z0-9_-]{11})'))[1]
  ),
  embed_url = 'https://www.youtube.com/embed/' || COALESCE(
    (regexp_match(v.youtube_url, 'youtu\.be/([A-Za-z0-9_-]{11})'))[1],
    (regexp_match(v.youtube_url, 'v=([A-Za-z0-9_-]{11})'))[1],
    (regexp_match(v.youtube_url, 'shorts/([A-Za-z0-9_-]{11})'))[1],
    (regexp_match(v.youtube_url, 'embed/([A-Za-z0-9_-]{11})'))[1]
  ),
  thumbnail_url = 'https://i.ytimg.com/vi/' || COALESCE(
    (regexp_match(v.youtube_url, 'youtu\.be/([A-Za-z0-9_-]{11})'))[1],
    (regexp_match(v.youtube_url, 'v=([A-Za-z0-9_-]{11})'))[1],
    (regexp_match(v.youtube_url, 'shorts/([A-Za-z0-9_-]{11})'))[1],
    (regexp_match(v.youtube_url, 'embed/([A-Za-z0-9_-]{11})'))[1]
  ) || '/hqdefault.jpg'
WHERE v.youtube_url IS NOT NULL AND v.youtube_url ~ 'youtu(be|\.com)';

-- Instagram (reel/p/tv) - se houverem links do Instagram
UPDATE videos v SET
  platform = 'instagram',
  video_url_original = COALESCE(v.video_url_original, v.youtube_url),
  video_id = (regexp_match(v.youtube_url, 'instagram\.com/(?:reel|p|tv)/([A-Za-z0-9_-]+)'))[1],
  embed_url = 'https://www.instagram.com/p/' ||
              (regexp_match(v.youtube_url, 'instagram\.com/(?:reel|p|tv)/([A-Za-z0-9_-]+)'))[1]
              || '/embed'
WHERE v.youtube_url IS NOT NULL AND v.youtube_url ~ 'instagram\.com/(reel|p|tv)/';