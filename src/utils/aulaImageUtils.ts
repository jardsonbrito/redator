import { supabase } from '@/integrations/supabase/client';

export interface AulaWithMedia {
  id?: string;
  video_thumbnail_url?: string | null;
  cover_source?: string | null;
  cover_url?: string | null;
  cover_file_path?: string | null;
  link_conteudo?: string;
  video_id?: string | null;
  platform?: string | null;
}

/**
 * Resolve the cover image URL for an aula with priority logic:
 * 1. Video thumbnail (video_thumbnail_url) - PRIMARY
 * 2. Manual cover (cover_file_path -> cover_url) - SECONDARY
 * 3. Placeholder image - FALLBACK
 */
export function resolveAulaCover(aula: AulaWithMedia): string {
  // 1. Video thumbnail - PRIMARY
  if (aula.video_thumbnail_url) {
    return aula.video_thumbnail_url;
  }

  // 2. Manual cover - SECONDARY
  if (aula.cover_file_path) {
    const { data } = supabase.storage
      .from('aulas')
      .getPublicUrl(aula.cover_file_path);
    return data.publicUrl;
  }

  if (aula.cover_url) {
    return aula.cover_url;
  }

  // 3. Placeholder - FALLBACK
  return '/placeholders/aula-cover.png';
}

/**
 * Video platform parsers and metadata extractors
 */
export class VideoParser {
  /**
   * Extract YouTube video ID from various URL formats
   */
  static parseYouTube(url: string): { id: string; embedUrl: string; thumbnailUrl: string } | null {
    const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/;
    const match = url.match(ytRegex);
    
    if (!match) return null;
    
    const id = match[1];
    return {
      id,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    };
  }

  /**
   * Extract Vimeo video ID from URL
   */
  static parseVimeo(url: string): { id: string; embedUrl: string } | null {
    const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
    const match = url.match(vimeoRegex);
    
    if (!match) return null;
    
    const id = match[1];
    return {
      id,
      embedUrl: `https://player.vimeo.com/video/${id}`
    };
  }

  /**
   * Extract Instagram shortcode from URL
   */
  static parseInstagram(url: string): { id: string; embedUrl: string } | null {
    const igRegex = /instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/;
    const match = url.match(igRegex);
    
    if (!match) return null;
    
    const id = match[1];
    return {
      id,
      embedUrl: `https://www.instagram.com/p/${id}/embed`
    };
  }

  /**
   * Detect platform and extract metadata from URL
   */
  static extractVideoMetadata(url: string): {
    platform: string;
    videoId: string;
    embedUrl: string;
    thumbnailUrl?: string;
  } | null {
    // Try YouTube first
    const youtube = this.parseYouTube(url);
    if (youtube) {
      return {
        platform: 'youtube',
        videoId: youtube.id,
        embedUrl: youtube.embedUrl,
        thumbnailUrl: youtube.thumbnailUrl
      };
    }

    // Try Vimeo
    const vimeo = this.parseVimeo(url);
    if (vimeo) {
      return {
        platform: 'vimeo',
        videoId: vimeo.id,
        embedUrl: vimeo.embedUrl
        // thumbnailUrl will be fetched via oEmbed
      };
    }

    // Try Instagram
    const instagram = this.parseInstagram(url);
    if (instagram) {
      return {
        platform: 'instagram',
        videoId: instagram.id,
        embedUrl: instagram.embedUrl
        // thumbnailUrl will be fetched via oEmbed
      };
    }

    return null;
  }
}

/**
 * Update aula with video metadata from URL
 */
export async function processAulaVideoMetadata(aulaId: string, linkConteudo: string): Promise<boolean> {
  try {
    const metadata = VideoParser.extractVideoMetadata(linkConteudo);
    
    if (!metadata) {
      console.log('No video metadata extracted for:', linkConteudo);
      return false;
    }

    const updateData: any = {
      platform: metadata.platform,
      video_id: metadata.videoId,
      embed_url: metadata.embedUrl,
      video_url_original: linkConteudo
    };

    // For YouTube, set thumbnail immediately
    if (metadata.thumbnailUrl) {
      updateData.video_thumbnail_url = metadata.thumbnailUrl;
    }

    const { error } = await supabase
      .from('aulas')
      .update(updateData)
      .eq('id', aulaId);

    if (error) {
      console.error('Error updating aula video metadata:', error);
      return false;
    }

    // For Vimeo/Instagram, we'll need to fetch thumbnail via oEmbed
    // This would typically be done server-side
    if (metadata.platform === 'vimeo' || metadata.platform === 'instagram') {
      console.log(`TODO: Fetch ${metadata.platform} thumbnail via oEmbed for:`, linkConteudo);
      // This could trigger a server-side job or edge function
    }

    return true;
  } catch (error) {
    console.error('Error processing aula video metadata:', error);
    return false;
  }
}