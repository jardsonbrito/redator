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
  width?: number
  height?: number
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

    const { essayId, tableOrigin, text, studentName, thematicPhrase, sendDate, turma, width = 2400, height = 3200 }: RenderRequest = await req.json()

    console.log(`🎨 Rendering essay ${essayId} from table ${tableOrigin}`)

    // Update status to rendering
    await supabase
      .from(tableOrigin as any)
      .update({ render_status: 'rendering' })
      .eq('id', essayId)

    // Create HTML content for the essay
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: 40px;
            background: white;
            color: #000;
            line-height: 1.6;
            width: ${width}px;
            min-height: ${height}px;
            box-sizing: border-box;
        }
        .header {
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .student-info {
            font-size: 16px;
            margin-bottom: 10px;
        }
        .thematic-phrase {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
            padding: 15px;
            border: 1px solid #333;
            background: #f9f9f9;
        }
        .essay-content {
            font-size: 16px;
            text-align: justify;
            white-space: pre-wrap;
            word-wrap: break-word;
            margin-top: 30px;
        }
        .metadata {
            position: absolute;
            bottom: 20px;
            right: 20px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="student-info"><strong>Aluno(a):</strong> ${studentName}</div>
        ${turma ? `<div class="student-info"><strong>Turma:</strong> ${turma}</div>` : ''}
        <div class="student-info"><strong>Data de Envio:</strong> ${new Date(sendDate).toLocaleDateString('pt-BR')}</div>
    </div>
    
    <div class="thematic-phrase">
        ${thematicPhrase}
    </div>
    
    <div class="essay-content">
        ${text}
    </div>
    
    <div class="metadata">
        Redação ID: ${essayId}
    </div>
</body>
</html>`

    console.log('🖼️ Generating image using canvas rendering...')

    // Simple canvas-based rendering using Deno Canvas
    const canvasCode = `
      const canvas = new OffscreenCanvas(${width}, ${height});
      const ctx = canvas.getContext('2d');
      
      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, ${width}, ${height});
      
      // Draw text content (simplified version)
      ctx.fillStyle = 'black';
      ctx.font = '16px Times New Roman';
      
      const lines = \`${text.replace(/`/g, '\\`')}\`.split('\\n');
      let y = 200;
      
      // Draw header
      ctx.font = 'bold 18px Times New Roman';
      ctx.fillText('${studentName}', 40, 80);
      ctx.fillText('${thematicPhrase}', 40, 120);
      
      // Draw content
      ctx.font = '16px Times New Roman';
      lines.forEach(line => {
        if (y < ${height} - 100) {
          ctx.fillText(line.substring(0, 100), 40, y);
          y += 25;
        }
      });
      
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      return await blob.arrayBuffer();
    `

    // Create SVG with proper text wrapping and dynamic height
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

    // Process essay text with proper line breaks
    const paragraphs = text.split('\n').filter(p => p.trim());
    const allLines: string[] = [];
    
    paragraphs.forEach(paragraph => {
      if (paragraph.trim()) {
        const wrappedLines = wrapText(paragraph.trim(), 85); // Optimal chars per line
        allLines.push(...wrappedLines);
        allLines.push(''); // Add space between paragraphs
      }
    });

    // Generate optimized HTML with proper canvas rendering dimensions
    const htmlWidth = 2400;
    const lineHeight = 32;
    const padding = 60;
    const contentHeight = Math.max(allLines.length * lineHeight + (padding * 2), 1600);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: ${padding}px;
            background: white;
            color: #000;
            line-height: ${lineHeight}px;
            width: ${htmlWidth}px;
            height: ${contentHeight}px;
            box-sizing: border-box;
            font-size: 20px;
            font-weight: 400;
            overflow: hidden;
        }
        .essay-content {
            width: 100%;
            white-space: pre-wrap;
            word-wrap: break-word;
            text-align: justify;
        }
        .line {
            margin-bottom: 8px;
            line-height: ${lineHeight}px;
        }
    </style>
</head>
<body>
    <div class="essay-content">
        ${allLines.map(line => 
          line.trim() ? 
            `<div class="line">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` :
            `<div class="line">&nbsp;</div>`
        ).join('')}
    </div>
</body>
</html>`;

    console.log('🖼️ Generating PNG image using browser rendering...')

    // Use Deno's built-in DOM and canvas API for better rendering
    const imageBinaryData = await generatePNGFromHTML(htmlContent, htmlWidth, contentHeight);
    
    // Upload PNG image
    const fileName = `${essayId}.png`
    const filePath = `essay-renders/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('essay-renders')
      .upload(filePath, imageBinaryData, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('essay-renders')
      .getPublicUrl(filePath)

    console.log(`✅ Image rendered and uploaded: ${publicUrl}`)

    // Update essay record with render URL
    const { error: updateError } = await supabase
      .from(tableOrigin as any)
      .update({ 
        render_status: 'ready',
        render_image_url: publicUrl
      })
      .eq('id', essayId)

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(`Update failed: ${updateError.message}`)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl: publicUrl,
      message: 'Essay rendered successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Render error:', error)
    
    // Update status to error if we have the necessary data
    try {
      const { essayId, tableOrigin } = await req.clone().json()
      if (essayId && tableOrigin) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        await supabase
          .from(tableOrigin as any)
          .update({ render_status: 'error' })
          .eq('id', essayId)
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError)
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Function to generate PNG from HTML using canvas rendering
async function generatePNGFromHTML(htmlContent: string, width: number, height: number): Promise<Uint8Array> {
  // Create a simplified canvas-based renderer
  // This is a basic implementation - in production you might want to use puppeteer or similar
  
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  
  // Set white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  
  // Set text properties for essay rendering
  ctx.fillStyle = 'black';
  ctx.font = '20px "Times New Roman", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Parse text from HTML and render line by line
  const textContent = htmlContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  const lines = textContent.split('\n').filter(line => line.trim());
  
  const lineHeight = 32;
  const padding = 60;
  let y = padding;
  
  for (const line of lines) {
    if (line.trim()) {
      // Wrap text manually if too long
      const words = line.trim().split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > width - (padding * 2) && currentLine) {
          ctx.fillText(currentLine, padding, y);
          y += lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        ctx.fillText(currentLine, padding, y);
        y += lineHeight;
      }
    } else {
      y += lineHeight / 2; // Space for empty lines
    }
    
    if (y > height - padding) break; // Prevent overflow
  }
  
  // Convert canvas to PNG
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}