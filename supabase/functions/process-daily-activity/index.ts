import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🚀 Iniciando processamento de atividades diárias...')

    // Pegar a data de referência (hoje por padrão)
    const referenceDate = new Date().toISOString().split('T')[0]
    console.log(`📅 Data de referência: ${referenceDate}`)

    // Chamar a função RPC para processar atividades
    const { data, error } = await supabaseClient.rpc('process_student_daily_activity', {
      p_reference_date: referenceDate
    })

    if (error) {
      console.error('❌ Erro ao processar atividades:', error)
      throw error
    }

    console.log('✅ Processamento concluído:', data)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Atividades diárias processadas com sucesso',
        data: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Erro no Edge Function:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
