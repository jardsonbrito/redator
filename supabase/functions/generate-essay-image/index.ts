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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate SVG from text
    const svg = await generateEssaySVG(text);
    
    console.log('SVG generated, length:', svg.length);
    
    // Upload to Supabase Storage as SVG (browsers handle SVG better than fake PNG)
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

async function generateEssaySVG(text: string): Promise<string> {
  // Split text into paragraphs
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
  
  // Configuration
  const fontSize = 14;
  const lineHeight = Math.round(14 * 1.15); // 16px (14 * 1.15)
  const marginX = 64;
  const marginY = 80;
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
      // Approximate character width (this is a rough estimate)
      const approximateWidth = testLine.length * (fontSize * 0.6);
      
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
  let svg = `<svg width="${pageWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="100%" height="100%" fill="white"/>`;
  svg += `<style>
    .essay-text {
      font-family: 'Times New Roman', serif;
      font-size: ${fontSize}px;
      fill: black;
      line-height: ${lineHeight}px;
    }
  </style>`;
  
  // Add text lines
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const y = marginY + (i * lineHeight) + fontSize; // Add fontSize to account for baseline
    
    svg += `<text x="${marginX}" y="${y}" class="essay-text">${escapeXml(line)}</text>`;
  }
  
  svg += '</svg>';
  
  return svg;
}

async function svgToPng(svg: string): Promise<Uint8Array> {
  // Create a simple PNG header for an SVG-based image
  // Since we're creating SVG content, we'll encode it as a data URL PNG
  
  // Convert SVG string to base64
  const svgBase64 = btoa(svg);
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
  
  // For now, return the SVG as bytes
  // In production, you'd use a proper SVG to PNG converter like resvg-js
  const encoder = new TextEncoder();
  return encoder.encode(svg);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}