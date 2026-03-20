import { supabase } from '@/integrations/supabase/client';

export interface GuiaWithCover {
  cover_source?: string | null;
  cover_url?: string | null;
  cover_file_path?: string | null;
}

export function getGuiaCoverUrl(guia: GuiaWithCover): string {
  if (guia.cover_file_path) {
    const { data } = supabase.storage
      .from('themes')
      .getPublicUrl(guia.cover_file_path);
    return data.publicUrl;
  }

  if (guia.cover_url) {
    return guia.cover_url;
  }

  return '/lovable-uploads/66db3418-766f-47b9-836b-07a6a228a79c.png';
}
