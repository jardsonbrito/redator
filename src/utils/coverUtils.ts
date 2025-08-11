import { supabase } from "@/integrations/supabase/client";

// Unified cover resolver: filePath (from Supabase Storage) → public URL; else raw URL; else placeholder
export function resolveCover(filePath?: string | null, url?: string | null): string {
  if (filePath) {
    const { data } = supabase.storage.from("themes").getPublicUrl(filePath);
    return data.publicUrl;
  }
  if (url) return url;
  return "/src/assets/tema-cover-placeholder.png";
}
