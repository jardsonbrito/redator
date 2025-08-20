import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RenderRequest {
  essayId: string
  tableOrigin: string
  text: string
  studentName: string
  thematicPhrase: string
  sendDate: string
  turma?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { essayId, tableOrigin, text, studentName, thematicPhrase, sendDate, turma }: RenderRequest = await req.json()

    console.log(`🎨 RENDERING ESSAY ${essayId} from table ${tableOrigin}`)
    console.log(`📝 Text length: ${text?.length || 0} characters`)
    console.log(`👤 Student: ${studentName}`)
    console.log(`📚 Theme: ${thematicPhrase}`)

    // Validate input
    if (!essayId || !tableOrigin || !text) {
      throw new Error('Missing required parameters: essayId, tableOrigin, or text')
    }

    // Update status to rendering
    await supabase
      .from(tableOrigin as any)
      .update({ render_status: 'rendering' })
      .eq('id', essayId)

    // TEXT PROCESSING - Clean line wrapping
    function wrapText(text: string, maxCharsPerLine: number): string[] {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        if ((currentLine + word).length <= maxCharsPerLine) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    }

    const paragraphs = text.split('\n').filter(p => p.trim());
    const allLines: string[] = [];
    
    paragraphs.forEach(paragraph => {
      if (paragraph.trim()) {
        const wrappedLines = wrapText(paragraph.trim(), 70); // Optimal for wide render
        allLines.push(...wrappedLines);
        allLines.push(''); // Add space between paragraphs
      }
    });

    // FIXED DIMENSIONS for PNG generation - COMPLETELY ISOLATED FROM FORM
    const renderWidth = 2400; // Fixed wide width for PNG
    const fontSize = 28; // Large readable font
    const lineHeight = 42; // Generous line spacing
    const padding = 100; // Extra padding for clean look
    const contentHeight = Math.max(1600, allLines.length * lineHeight + (padding * 2));
    
    console.log(`🎯 RENDER CONFIG: ${renderWidth}x${contentHeight} | Font: ${fontSize}px | Lines: ${allLines.length}`);

    // SVG GENERATION using robust approach for Deno
    const imageBuffer = await generateCleanSVG(allLines, renderWidth, contentHeight, fontSize, lineHeight, padding);
    
    // Cache busting with timestamp
    const timestamp = Date.now();
    const fileName = `${essayId}_v${timestamp}.svg`;
    const filePath = `essay-renders/${fileName}`;

    console.log(`📤 UPLOADING SVG: ${filePath} | Size: ${imageBuffer.length} bytes`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('essay-renders')
      .upload(filePath, imageBuffer, {
        contentType: 'image/svg+xml',
        upsert: true,
        cacheControl: 'no-cache, max-age=0'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL with cache busting
    const { data: { publicUrl } } = supabase.storage
      .from('essay-renders')
      .getPublicUrl(filePath);
    
    const finalImageUrl = `${publicUrl}?v=${timestamp}`;

    console.log(`✅ SVG GENERATED: ${finalImageUrl}`);
    console.log(`📊 FINAL DIMENSIONS: ${renderWidth}x${contentHeight}px`);

    // Update essay record with render URL and complete metadata
    const { error: updateError } = await supabase
      .from(tableOrigin as any)
      .update({ 
        render_status: 'ready',
        render_image_url: finalImageUrl,
        render_width: renderWidth,
        render_height: contentHeight
      })
      .eq('id', essayId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Update failed: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl: finalImageUrl,
      render_width: renderWidth,
      render_height: contentHeight,
      timestamp: timestamp,
      message: `SVG rendered successfully at ${renderWidth}x${contentHeight}px`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 RENDER ERROR:', error);
    
    // Update status to error if we have the necessary data
    try {
      const { essayId, tableOrigin } = await req.clone().json();
      if (essayId && tableOrigin) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from(tableOrigin as any)
          .update({ render_status: 'error' })
          .eq('id', essayId);
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})

// SVG GENERATION - ROBUST APPROACH FOR DENO
async function generateCleanSVG(
  lines: string[], 
  width: number, 
  height: number, 
  fontSize: number, 
  lineHeight: number, 
  padding: number
): Promise<Uint8Array> {
  
  let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svgContent += `<rect width="100%" height="100%" fill="white"/>`;
  
  let y = padding + fontSize;
  
  // Render each line as SVG text
  for (const line of lines) {
    if (line.trim()) {
      // Simple text wrapping for SVG
      const words = line.trim().split(' ');
      let currentLine = '';
      const maxLineLength = Math.floor((width - padding * 2) / (fontSize * 0.6)); // Estimate character width
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        
        if (testLine.length > maxLineLength && currentLine) {
          // Add current line to SVG
          const escapedLine = currentLine
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          
          svgContent += `<text x="${padding}" y="${y}" font-family="Times New Roman, serif" font-size="${fontSize}" fill="black">${escapedLine}</text>`;
          y += lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      // Add remaining text
      if (currentLine) {
        const escapedLine = currentLine
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        
        svgContent += `<text x="${padding}" y="${y}" font-family="Times New Roman, serif" font-size="${fontSize}" fill="black">${escapedLine}</text>`;
        y += lineHeight;
      }
    } else {
      // Empty line - add space
      y += lineHeight / 2;
    }
    
    // Prevent overflow
    if (y > height - padding) break;
  }
  
  svgContent += '</svg>';
  
  // Convert SVG to Uint8Array
  const encoder = new TextEncoder();
  return encoder.encode(svgContent);
}