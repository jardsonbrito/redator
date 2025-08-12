# Sistema de Capas para Aulas Gravadas

Este documento descreve o sistema de capas para aulas que prioriza thumbnails de vídeos como imagem principal.

## Prioridade de Capas

O sistema segue a seguinte ordem de prioridade para exibir a capa de uma aula:

1. **Thumbnail do vídeo** (`video_thumbnail_url`) - PRIMÁRIA
2. **Capinha manual** (`cover_file_path` ou `cover_url`) - SECUNDÁRIA  
3. **Placeholder** (`/placeholders/aula-cover.png`) - FALLBACK

## Plataformas Suportadas

### YouTube
- ✅ **Detecção automática**: Funciona imediatamente
- ✅ **Thumbnail**: Extraído automaticamente via `i.ytimg.com`
- ✅ **Formatos**: `youtu.be/`, `youtube.com/watch?v=`, `youtube.com/shorts/`, `youtube.com/embed/`

### Vimeo  
- ✅ **Detecção automática**: Funciona
- ⚠️ **Thumbnail**: Requer processamento via oEmbed (edge function)
- 📋 **TODO**: Implementar job para buscar thumbnails via API

### Instagram
- ✅ **Detecção automática**: Funciona  
- ⚠️ **Thumbnail**: Requer processamento via oEmbed (edge function)
- 📋 **TODO**: Implementar job para buscar thumbnails via API

## Estrutura do Banco

### Novas colunas na tabela `aulas`:

```sql
video_url_original text,        -- URL original do vídeo
platform text,                 -- 'youtube', 'vimeo', 'instagram', 'arquivo'
video_id text,                  -- ID extraído da URL
embed_url text,                 -- URL para embed do vídeo
video_thumbnail_url text,       -- Thumbnail do vídeo (usado como 1ª opção)
cover_source text,              -- 'upload' ou 'url'
cover_file_path text,           -- Caminho no storage
cover_url text                  -- URL externa da capa manual
```

## Como Usar

### No formulário de aula:
1. Cole o link do vídeo no campo "Link do Conteúdo"
2. O preview da capa aparecerá automaticamente (se for YouTube)
3. Opcionalmente, faça upload de uma capa personalizada para substituir

### Na listagem:
- A capa exibida seguirá a prioridade: vídeo → manual → placeholder
- Vídeos do YouTube mostrarão automaticamente o thumbnail
- Para Vimeo/Instagram, pode aparecer o placeholder até o processamento

## Função Utilitária

```typescript
import { resolveAulaCover } from '@/utils/aulaImageUtils';

// Uso simples
const coverUrl = resolveAulaCover(aula);

// A função resolve automaticamente a prioridade:
// 1. aula.video_thumbnail_url
// 2. aula.cover_file_path → storage URL  
// 3. aula.cover_url
// 4. placeholder
```

## Edge Function (TODO)

Para Vimeo e Instagram, existe uma edge function em `supabase/functions/process-video-oembed/` que pode ser chamada para processar thumbnails via oEmbed:

```typescript
// Exemplo de uso (quando implementado)
const response = await supabase.functions.invoke('process-video-oembed', {
  body: { aulaId, url, platform }
});
```

## Backfill

Aulas existentes foram automaticamente processadas para vídeos do YouTube durante a migração. Para Vimeo/Instagram, é necessário rodar um job manual.

## Critérios de Aceite ✅

- [x] Capas de aulas exibem thumbnail do vídeo quando disponível
- [x] Fallback para capa manual e placeholder funciona
- [x] Preview no formulário mostra capa do vídeo  
- [x] YouTube funciona automaticamente
- [x] Aulas antigas processadas (YouTube)
- [x] Sistema não quebra se vídeo não tiver thumbnail

## Próximos Passos

1. **Implementar job para Vimeo/Instagram**: Processar aulas existentes via oEmbed
2. **Melhorar edge function**: Adicionar retry e melhor tratamento de erros
3. **Cache de thumbnails**: Implementar cache local das thumbnails externas
4. **Interface de reprocessamento**: Botão para reprocessar metadados de vídeo