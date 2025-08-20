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

  let requestData;
  try {
    requestData = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { essayId, text, table } = requestData;
  
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
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    console.log('OpenAI API key not found, generating simple SVG fallback');
    return generateSimpleSVGFallback(essayId, text, table, supabaseUrl, supabaseServiceKey);
  }

  try {
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
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1536', // Portrait format like a real essay
        quality: 'hd'
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
    console.error('Error with OpenAI generation, falling back to SVG:', error);
    
    // Try fallback SVG generation if OpenAI fails
    try {
      console.log('Attempting SVG fallback...');
      return await generateSimpleSVGFallback(essayId, text, table, supabaseUrl, supabaseServiceKey);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
});

async function generateSimpleSVGFallback(essayId: string, text: string, table: string, supabaseUrl: string, supabaseServiceKey: string) {
  console.log('Generating SVG fallback for essay:', essayId);
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Generate SVG from text
  const svg = await generateEssaySVG(text);
  
  console.log('SVG generated, length:', svg.length);
  
  // Upload to Supabase Storage as SVG
  const fileName = `rendered/${essayId}.svg`;
  const svgBuffer = new TextEncoder().encode(svg);
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('essays')
    .upload(fileName, svgBuffer, {
      contentType: 'image/svg+xml',
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

  console.log('SVG uploaded successfully:', publicUrl);

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
}

async function generateEssaySVG(text: string): Promise<string> {
  // Split text into paragraphs
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
  
  // Configuration - similar to shown image
  const fontSize = 14;
  const lineHeight = Math.round(14 * 1.15); // 16.1px (14 * 1.15)
  const marginX = 60; // Margins similar to the image
  const marginY = 60; // Top/bottom margins
  const pageWidth = 800;
  const maxLineWidth = pageWidth - (marginX * 2);
  
  // Calculate wrapped lines for each paragraph
  const allLines: string[] = [];
  
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      // Approximate character width for Times New Roman at 14px (more accurate estimate)
      const approximateWidth = testLine.length * (fontSize * 0.55);
      
      if (approximateWidth <= maxLineWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Add paragraph lines to all lines
    allLines.push(...lines);
    // Add empty line between paragraphs (except for the last one)
    if (paragraph !== paragraphs[paragraphs.length - 1]) {
      allLines.push('');
    }
  }
  
  // Calculate total height
  const contentHeight = allLines.length * lineHeight;
  const totalHeight = contentHeight + (marginY * 2);
  
  // Generate SVG
  let svg = `<svg width="${pageWidth}" height="${totalHeight}" viewBox="0 0 ${pageWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">`;
  svg += `<rect width="100%" height="100%" fill="white"/>`;
  svg += `<style>
    .essay-text {
      font-family: 'Times New Roman', serif;
      font-size: ${fontSize}px;
      fill: black;
      line-height: ${lineHeight}px;
      font-weight: normal;
    }
  </style>`;
  
  // Add text lines with proper spacing
  let isParagraphStart = true;
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const y = marginY + (i * lineHeight) + fontSize; // Add fontSize to account for baseline
    
    // Check if this is start of new paragraph (after empty line or first line)
    if (i === 0 || allLines[i-1] === '') {
      isParagraphStart = true;
    }
    
    // Only add text if line is not empty
    if (line.trim()) {
      // For first line of paragraph, no indentation (like in the image)
      // For other lines, normal positioning
      const xPosition = marginX;
      svg += `<text x="${xPosition}" y="${y}" class="essay-text">${escapeXml(line)}</text>`;
      isParagraphStart = false;
    }
  }
  
  svg += '</svg>';
  
  return svg;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}