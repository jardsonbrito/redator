import { supabase } from '@/integrations/supabase/client';

export interface TemaWithCover {
  id?: string;
  cover_source?: string | null;
  cover_url?: string | null;
  cover_file_path?: string | null;
  // Legacy field
  imagem_texto_4_url?: string | null;
}

/**
 * Resolve the cover image URL for a tema with fallback logic:
 * 1. New upload path (cover_file_path) - get public URL from storage
 * 2. New URL field (cover_url) 
 * 3. Legacy field (imagem_texto_4_url) - only if new fields are empty
 * 4. Placeholder image as final fallback
 */
export function getTemaCoverUrl(tema: TemaWithCover): string {
  // 1. New upload path - get public URL from storage
  if (tema.cover_file_path) {
    const { data } = supabase.storage
      .from('themes')
      .getPublicUrl(tema.cover_file_path);
    return data.publicUrl;
  }

  // 2. New URL field
  if (tema.cover_url) {
    return tema.cover_url;
  }

  // 3. Legacy fallback - only if new fields are empty
  if (tema.imagem_texto_4_url) {
    return tema.imagem_texto_4_url;
  }

  // 4. Final fallback - placeholder
  return '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
}

/**
 * Resolve the motivator IV image URL for a tema
 */
export function getTemaMotivatorIVUrl(tema: {
  motivator4_source?: string | null;
  motivator4_url?: string | null;
  motivator4_file_path?: string | null;
}): string | null {
  // Only show if motivator4 is explicitly set (not 'none')
  if (tema.motivator4_source === 'none' || !tema.motivator4_source) {
    return null;
  }

  // Upload path - get public URL from storage
  if (tema.motivator4_file_path) {
    const { data } = supabase.storage
      .from('themes')
      .getPublicUrl(tema.motivator4_file_path);
    return data.publicUrl;
  }

  // URL field
  if (tema.motivator4_url) {
    return tema.motivator4_url;
  }

  return null;
}