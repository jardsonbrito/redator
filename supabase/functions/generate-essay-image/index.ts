import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { essayId, text, table } = await req.json();
    
    if (!essayId || !text || !table) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: essayId, text, table' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating image for essay:', { essayId, table, textLength: text.length });

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a realistic handwritten essay image with OpenAI
    const prompt = `Create a high-quality image of a handwritten essay on lined paper. The essay should have the following characteristics:
- Written with blue ink pen
- On white lined paper with horizontal blue lines
- Font size equivalent to 14pt with 1.15 line spacing
- Text should fill the entire width of the page with proper margins
- Clean, legible handwriting
- Natural paper texture
- The text content should be: "${text.substring(0, 500)}..." (continue with similar academic Portuguese text)
- Make it look like a real student's handwritten essay
- Ensure the handwriting fills the entire page width effectively
- Use proper paragraph spacing
- High resolution, professional quality image`;

    console.log('Calling OpenAI DALL-E to generate essay image...');

    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1536', // Portrait format like a real essay
        quality: 'high',
        response_format: 'url'
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    const imageUrl = openaiData.data[0].url;
    
    console.log('OpenAI generated image URL:', imageUrl);

    // Download the image from OpenAI
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download generated image');
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);
    
    // Upload to Supabase Storage
    const fileName = `rendered/${essayId}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('essays')
      .upload(fileName, uint8Array, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('essays')
      .getPublicUrl(fileName);

    console.log('Image uploaded successfully:', publicUrl);

    // Update the essay record with image URLs
    const updateData = {
      image_path: fileName,
      image_url: publicUrl
    };

    let updateError;
    if (table === 'redacoes_enviadas') {
      const { error } = await supabase
        .from('redacoes_enviadas')
        .update(updateData)
        .eq('id', essayId);
      updateError = error;
    } else if (table === 'redacoes_simulado') {
      const { error } = await supabase
        .from('redacoes_simulado')
        .update(updateData)
        .eq('id', essayId);
      updateError = error;
    } else if (table === 'redacoes_exercicio') {
      const { error } = await supabase
        .from('redacoes_exercicio')
        .update(updateData)
        .eq('id', essayId);
      updateError = error;
    }

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl, 
        imagePath: fileName 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating essay image:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});