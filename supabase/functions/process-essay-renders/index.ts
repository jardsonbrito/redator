import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('🔄 Starting background essay render processing...')

    // Function to process essays from a specific table
    async function processEssaysFromTable(tableName: string) {
      console.log(`📋 Processing table: ${tableName}`)
      
      const { data: pendingEssays, error } = await supabase
        .from(tableName)
        .select('id, redacao_texto, nome_aluno, frase_tematica, data_envio, turma, email_aluno')
        .eq('render_status', 'pending')
        .is('redacao_manuscrita_url', null) // Only typed essays
        .limit(5) // Process in batches to avoid timeouts

      if (error) {
        console.error(`Error fetching from ${tableName}:`, error)
        return
      }

      if (!pendingEssays || pendingEssays.length === 0) {
        console.log(`✅ No pending essays in ${tableName}`)
        return
      }

      console.log(`🎯 Found ${pendingEssays.length} pending essays in ${tableName}`)

      // Process each essay
      for (const essay of pendingEssays) {
        try {
          console.log(`🎨 Processing essay ${essay.id} from ${tableName}`)

          // Call the render function directly
          const renderParams = {
            essayId: essay.id,
            tableOrigin: tableName,
            text: essay.redacao_texto || '',
            studentName: essay.nome_aluno || 'Aluno',
            thematicPhrase: tableName === 'redacoes_simulado' ? 'Tema do Simulado' : (essay.frase_tematica || 'Tema Livre'),
            sendDate: new Date(essay.data_envio).toLocaleDateString('pt-BR'),
            turma: essay.turma || 'Visitante'
          }

          // Invoke the render function
          const { data: renderResult, error: renderError } = await supabase.functions.invoke('render-essay-to-image', {
            body: renderParams
          })

          if (renderError) {
            console.error(`❌ Render error for essay ${essay.id}:`, renderError)
            
            // Update status to error
            await supabase
              .from(tableName)
              .update({ render_status: 'error' })
              .eq('id', essay.id)
            
            continue
          }

          if (renderResult?.success) {
            console.log(`✅ Successfully rendered essay ${essay.id}`)
          } else {
            console.error(`❌ Render failed for essay ${essay.id}:`, renderResult?.error)
          }

        } catch (error) {
          console.error(`💥 Unexpected error processing essay ${essay.id}:`, error)
          
          // Update status to error
          await supabase
            .from(tableName)
            .update({ render_status: 'error' })
            .eq('id', essay.id)
        }

        // Small delay between renders to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Process essays from all tables
    await processEssaysFromTable('redacoes_enviadas')
    await processEssaysFromTable('redacoes_simulado') 
    await processEssaysFromTable('redacoes_exercicio')

    console.log('✅ Background essay render processing completed')

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Background essay render processing completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('🚨 BACKGROUND PROCESSING ERROR:', error)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})