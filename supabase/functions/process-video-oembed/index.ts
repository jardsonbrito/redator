import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoMetadata {
  aulaId: string;
  url: string;
  platform: 'vimeo' | 'instagram';
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { aulaId, url, platform }: VideoMetadata = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let thumbnailUrl: string | null = null;

    if (platform === 'vimeo') {
      thumbnailUrl = await fetchVimeoThumbnail(url);
    } else if (platform === 'instagram') {
      thumbnailUrl = await fetchInstagramThumbnail(url);
    }

    if (thumbnailUrl) {
      const { error } = await supabaseClient
        .from('aulas')
        .update({ video_thumbnail_url: thumbnailUrl })
        .eq('id', aulaId);

      if (error) {
        console.error('Error updating aula thumbnail:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, thumbnailUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing video oEmbed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchVimeoThumbnail(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch (error) {
    console.error('Error fetching Vimeo thumbnail:', error);
    return null;
  }
}

async function fetchInstagramThumbnail(url: string): Promise<string | null> {
  try {
    // Try public oEmbed first (may have rate limits)
    const oembedUrl = `https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch (error) {
    console.error('Error fetching Instagram thumbnail:', error);
    return null;
  }
}