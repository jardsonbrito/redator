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
 * Capture a frame from video as thumbnail
 */
export async function captureVideoFrame(videoUrl: string, timeSeek = 5): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Could not get canvas context');
      resolve(null);
      return;
    }

    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.currentTime = timeSeek;

    video.onloadedmetadata = () => {
      // Set canvas size to video dimensions (with max size limit)
      const maxWidth = 1280;
      const maxHeight = 720;
      let { videoWidth, videoHeight } = video;

      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const ratio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
        videoWidth *= ratio;
        videoHeight *= ratio;
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;
    };

    video.onseeked = () => {
      try {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('✅ Video frame captured successfully');
            resolve(blob);
          } else {
            console.error('❌ Failed to create blob from canvas');
            resolve(null);
          }
          
          // Cleanup
          video.remove();
          canvas.remove();
          URL.revokeObjectURL(video.src);
        }, 'image/jpeg', 0.8);
      } catch (error) {
        console.error('❌ Error capturing video frame:', error);
        resolve(null);
        video.remove();
        canvas.remove();
      }
    };

    video.onerror = (error) => {
      console.error('❌ Video load error (possibly CORS):', error);
      resolve(null);
      video.remove();
      canvas.remove();
    };

    video.ontimeupdate = () => {
      // Stop once we reach the seek time
      if (video.currentTime >= timeSeek) {
        video.pause();
      }
    };

    // Set video source and load
    video.src = videoUrl;
    video.load();
  });
}

/**
 * Upload captured frame to Supabase storage
 */
export async function uploadVideoThumbnail(aulaId: string, frameBlob: Blob): Promise<string | null> {
  try {
    const fileName = `video-thumbnails/${aulaId}-${Date.now()}.jpg`;
    
    const { data, error } = await supabase.storage
      .from('aulas')
      .upload(fileName, frameBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('❌ Error uploading video thumbnail:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('aulas')
      .getPublicUrl(fileName);

    console.log('✅ Video thumbnail uploaded:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Error in uploadVideoThumbnail:', error);
    return null;
  }
}

/**
 * Update aula with video metadata from URL
 * Enhanced with frame capture fallback
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
      console.log('✅ Using YouTube thumbnail:', metadata.thumbnailUrl);
    } else {
      // For platforms without immediate thumbnail, try to capture frame
      console.log('🎬 No immediate thumbnail, attempting frame capture...');
      
      try {
        const frameBlob = await captureVideoFrame(linkConteudo, 10); // Try at 10 seconds
        if (frameBlob) {
          const thumbnailUrl = await uploadVideoThumbnail(aulaId, frameBlob);
          if (thumbnailUrl) {
            updateData.video_thumbnail_url = thumbnailUrl;
            console.log('✅ Generated thumbnail from video frame:', thumbnailUrl);
          }
        } else {
          console.log('⚠️ Could not capture frame, will use placeholder');
        }
      } catch (error) {
        console.error('❌ Frame capture failed:', error);
      }
    }

    const { error } = await supabase
      .from('aulas')
      .update(updateData)
      .eq('id', aulaId);

    if (error) {
      console.error('Error updating aula video metadata:', error);
      return false;
    }

    // For Vimeo/Instagram without frame capture, try oEmbed as fallback
    if (!updateData.video_thumbnail_url && (metadata.platform === 'vimeo' || metadata.platform === 'instagram')) {
      console.log(`📡 Triggering oEmbed fallback for ${metadata.platform}...`);
      // This could trigger a server-side job or edge function
      try {
        await supabase.functions.invoke('process-video-oembed', {
          body: { aulaId, url: linkConteudo, platform: metadata.platform }
        });
      } catch (error) {
        console.error('oEmbed fallback failed:', error);
      }
    }

    return true;
  } catch (error) {
    console.error('Error processing aula video metadata:', error);
    return false;
  }
}