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
        const wrappedLines = wrapText(paragraph.trim(), 90); // Increased chars per line for wider text
        allLines.push(...wrappedLines);
        allLines.push(''); // Add space between paragraphs
      }
    });

    // Calculate dynamic height for large, readable text
    const lineHeight = 40; // Larger line height for better readability
    const padding = 80; // More padding for cleaner look
    const contentHeight = allLines.length * lineHeight;
    const calculatedHeight = Math.max(600, contentHeight + (padding * 2));

    // Use larger width for better text display
    const renderWidth = Math.max(width, 2800);

    const svgContent = `
      <svg width="${renderWidth}" height="${calculatedHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        
        <!-- Clean essay content optimized for correction -->
        ${allLines.map((line, i) => {
          const y = padding + (i * lineHeight);
          return line.trim() ? 
            `<text x="80" y="${y}" font-family="Times New Roman, serif" font-size="22" fill="black" font-weight="400">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>` :
            '';
        }).join('')}
      </svg>
    `

    // Convert SVG to PNG using a conversion service or create PNG directly
    const svgBuffer = new TextEncoder().encode(svgContent)
    
    // Upload SVG as image (browsers can render SVG as images)
    const fileName = `${essayId}.svg`
    const filePath = `essay-renders/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('essay-renders')
      .upload(filePath, svgBuffer, {
        contentType: 'image/svg+xml',
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