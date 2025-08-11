import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      temas: {
        Row: {
          id: string
          status: string
          scheduled_publish_at: string | null
          published_at: string | null
          frase_tematica: string
          [key: string]: any
        }
        Update: {
          status?: string
          scheduled_publish_at?: string | null
          published_at?: string | null
          [key: string]: any
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const now = new Date().toISOString()
    
    console.log(`🚀 Starting scheduled publish check at ${now}`)
    
    // Find themes that are scheduled to be published and past due
    const { data: scheduledThemes, error: selectError } = await supabaseClient
      .from('temas')
      .select('id, frase_tematica, scheduled_publish_at')
      .eq('status', 'rascunho')
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', now)
      .limit(100) // Process up to 100 themes per run
    
    if (selectError) {
      console.error('❌ Error selecting scheduled themes:', selectError)
      throw selectError
    }

    if (!scheduledThemes || scheduledThemes.length === 0) {
      console.log('✅ No themes to publish at this time')
      return new Response(
        JSON.stringify({ 
          success: true, 
          published_count: 0,
          message: 'No themes scheduled for publication'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`📋 Found ${scheduledThemes.length} themes to publish:`)
    scheduledThemes.forEach(theme => {
      console.log(`  - ${theme.frase_tematica} (scheduled: ${theme.scheduled_publish_at})`)
    })

    let publishedCount = 0
    const results = []

    // Process each theme individually to avoid conflicts
    for (const theme of scheduledThemes) {
      try {
        const { data: updatedTheme, error: updateError } = await supabaseClient
          .from('temas')
          .update({
            status: 'publicado',
            published_at: now,
            scheduled_publish_at: null
          })
          .eq('id', theme.id)
          .eq('status', 'rascunho') // Ensure it's still a draft (prevent race conditions)
          .select('id, frase_tematica')
          .single()

        if (updateError) {
          console.error(`❌ Error publishing theme ${theme.id}:`, updateError)
          results.push({
            id: theme.id,
            title: theme.frase_tematica,
            success: false,
            error: updateError.message
          })
        } else if (updatedTheme) {
          console.log(`✅ Successfully published theme: ${updatedTheme.frase_tematica}`)
          publishedCount++
          results.push({
            id: theme.id,
            title: theme.frase_tematica,
            success: true
          })
        } else {
          console.log(`⚠️ Theme ${theme.id} was already processed or changed status`)
          results.push({
            id: theme.id,
            title: theme.frase_tematica,
            success: false,
            error: 'Theme was already processed or status changed'
          })
        }
      } catch (error) {
        console.error(`❌ Unexpected error processing theme ${theme.id}:`, error)
        results.push({
          id: theme.id,
          title: theme.frase_tematica,
          success: false,
          error: error.message
        })
      }
    }

    console.log(`🎉 Scheduler completed. Published ${publishedCount}/${scheduledThemes.length} themes`)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        published_count: publishedCount,
        total_processed: scheduledThemes.length,
        results,
        timestamp: now
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('💥 Fatal error in scheduler:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})