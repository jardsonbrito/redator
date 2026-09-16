import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeEixo(eixo: string | null): string {
  if (!eixo || eixo.trim() === '') return 'Sem Eixo'
  const normalized = eixo.trim().toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function calcularIEE(valores: number[]): { valor: number; classificacao: string; descricao: string } {
  if (valores.length === 0) {
    return { valor: 0, classificacao: 'desequilibrado', descricao: 'Sem dados para analise' }
  }
  if (valores.length === 1) {
    return { valor: 1, classificacao: 'equilibrado', descricao: 'Apenas um eixo presente' }
  }
  const media = valores.reduce((a, b) => a + b, 0) / valores.length
  if (media === 0) {
    return { valor: 0, classificacao: 'desequilibrado', descricao: 'Nenhum tema cadastrado' }
  }
  const variancia = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / valores.length
  const desvioPadrao = Math.sqrt(variancia)
  const coeficienteVariacao = desvioPadrao / media
  const iee = Math.max(0, Math.min(1, 1 - coeficienteVariacao))
  const ieeArredondado = Math.round(iee * 100) / 100

  if (ieeArredondado >= 0.7) {
    return { valor: ieeArredondado, classificacao: 'equilibrado', descricao: 'Distribuicao equilibrada entre os eixos tematicos' }
  } else if (ieeArredondado >= 0.4) {
    return { valor: ieeArredondado, classificacao: 'moderado', descricao: 'Distribuicao moderada - considere diversificar' }
  } else {
    return { valor: ieeArredondado, classificacao: 'desequilibrado', descricao: 'Distribuicao concentrada - diversifique os eixos' }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: temas, error: selectError } = await supabaseClient
      .from('temas')
      .select('id, frase_tematica, eixo_tematico, status, published_at, created_at')
      .order('published_at', { ascending: false, nullsFirst: false })

    if (selectError) {
      return new Response(
        JSON.stringify({ success: false, error: selectError.message, data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!temas || temas.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            eixos: [],
            totais: { total_temas: 0, total_publicados: 0, total_rascunhos: 0, total_eixos: 0, media_por_eixo: 0 },
            iee: { valor: 0, classificacao: 'desequilibrado', descricao: 'Nenhum tema cadastrado' },
            ultimosTemas: [],
            timestamp: new Date().toISOString()
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Agrupar por eixo - SEM incluir array de temas
    const eixosMap: Record<string, { total: number; publicados: number; rascunhos: number }> = {}

    for (const tema of temas) {
      const eixoNormalizado = normalizeEixo(tema.eixo_tematico)

      if (!eixosMap[eixoNormalizado]) {
        eixosMap[eixoNormalizado] = { total: 0, publicados: 0, rascunhos: 0 }
      }

      eixosMap[eixoNormalizado].total++

      if (tema.status === 'publicado') {
        eixosMap[eixoNormalizado].publicados++
      } else {
        eixosMap[eixoNormalizado].rascunhos++
      }
    }

    const totalTemas = temas.length
    const totalPublicados = temas.filter(t => t.status === 'publicado').length
    const totalRascunhos = totalTemas - totalPublicados
    const eixosKeys = Object.keys(eixosMap)
    const totalEixos = eixosKeys.length
    const mediaPorEixo = totalEixos > 0 ? Math.round((totalTemas / totalEixos) * 10) / 10 : 0

    // Converter para array - SEM array de temas dentro
    const eixosArray = eixosKeys.map(eixo => {
      const stats = eixosMap[eixo]
      return {
        eixo,
        total: stats.total,
        publicados: stats.publicados,
        rascunhos: stats.rascunhos,
        percentual: Math.round((stats.total / totalTemas) * 1000) / 10
      }
    }).sort((a, b) => b.total - a.total)

    const iee = calcularIEE(eixosArray.map(e => e.total))

    // Ultimos 10 temas publicados
    const ultimosTemas = temas
      .filter(t => t.status === 'publicado' && t.published_at)
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        frase_tematica: t.frase_tematica,
        eixo_tematico: normalizeEixo(t.eixo_tematico),
        published_at: t.published_at
      }))

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          eixos: eixosArray,
          totais: {
            total_temas: totalTemas,
            total_publicados: totalPublicados,
            total_rascunhos: totalRascunhos,
            total_eixos: totalEixos,
            media_por_eixo: mediaPorEixo
          },
          iee,
          ultimosTemas,
          timestamp: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, data: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
