import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { table, record_id, action } = await req.json()

    // Validar parâmetros
    if (!table || !record_id || !action) {
      throw new Error('Missing required parameters: table, record_id, action')
    }

    if (!['temas', 'videos', 'redacoes'].includes(table)) {
      throw new Error(`Invalid table: ${table}`)
    }

    if (!['sync', 'unsync'].includes(action)) {
      throw new Error(`Invalid action: ${action}`)
    }

    // Extrair e validar token do header Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header')
    }
    const token = authHeader.replace('Bearer ', '')

    // Cliente Supabase do App (Redator)
    const appSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Validar token efêmero
    const { data: tokenData, error: tokenError } = await appSupabase
      .from('admin_sync_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenData) {
      throw new Error('Invalid or expired token')
    }

    // Marcar token como usado
    await appSupabase
      .from('admin_sync_tokens')
      .update({ used: true })
      .eq('id', tokenData.id)

    // Cliente Supabase do Blog
    const blogSupabase = createClient(
      Deno.env.get('BLOG_SUPABASE_URL') ?? '',
      Deno.env.get('BLOG_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Buscar registro no App
    const { data: record, error: recordError } = await appSupabase
      .from(table)
      .select('*')
      .eq('id', record_id)
      .single()

    if (recordError || !record) {
      throw new Error(`Record not found in ${table}`)
    }

    if (action === 'unsync') {
      // Arquivar post no blog
      if (record.blog_post_id) {
        await blogSupabase
          .from('posts')
          .update({ status: 'archived' })
          .eq('id', record.blog_post_id)

        // Limpar blog_post_id no App
        await appSupabase
          .from(table)
          .update({
            blog_post_id: null,
            publicar_no_blog: false
          })
          .eq('id', record_id)
      }

      return new Response(
        JSON.stringify({ success: true, action: 'unsync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ação: sync
    let payload: any = {}
    let tipo = ''
    let title = ''
    let slug = ''
    let content = ''
    let featuredImage = ''
    let dadosExtra: any = {}

    // Construir payload baseado no tipo de tabela
    if (table === 'temas') {
      if (record.status !== 'publicado') {
        throw new Error('Tema must have status "publicado" to sync')
      }

      tipo = 'tema'
      title = record.frase_tematica
      slug = generateSlug(title, record.id)
      featuredImage = record.cover_url || ''

      // Montar textos motivadores no content
      const textos = []
      if (record.texto_1) textos.push(`<div class="texto-motivador"><h3>Texto 1</h3>${record.texto_1}</div>`)
      if (record.texto_2) textos.push(`<div class="texto-motivador"><h3>Texto 2</h3>${record.texto_2}</div>`)
      if (record.texto_3) textos.push(`<div class="texto-motivador"><h3>Texto 3</h3>${record.texto_3}</div>`)
      if (record.texto_4) textos.push(`<div class="texto-motivador"><h3>Texto 4</h3>${record.texto_4}</div>`)
      if (record.texto_5) textos.push(`<div class="texto-motivador"><h3>Texto 5</h3>${record.texto_5}</div>`)
      content = textos.join('\n\n')

      dadosExtra = {
        eixoTematico: record.eixo_tematico,
        motivador1: record.texto_1,
        motivador2: record.texto_2,
        motivador3: record.texto_3,
        motivador4: record.texto_4,
        motivador5: record.texto_5,
        motivador4Url: record.motivator4_url,
        source_table: 'temas',
        source_id: record.id
      }

    } else if (table === 'videos') {
      if (record.status_publicacao !== 'publicado') {
        throw new Error('Video must have status_publicacao "publicado" to sync')
      }

      tipo = 'video'
      title = record.titulo
      slug = generateSlug(title, record.id)
      featuredImage = record.cover_url || record.thumbnail_url || ''
      content = `<p>Assista ao vídeo completo.</p>`

      dadosExtra = {
        linkVideo: record.youtube_url,
        tipoVideo: record.platform || 'youtube',
        youtubeId: record.video_id,
        autor: record.autor || '',
        source_table: 'videos',
        source_id: record.id
      }

    } else if (table === 'redacoes') {
      tipo = 'redacao_exemplar'
      title = record.frase_tematica || 'Redação Exemplar'
      slug = generateSlug(title, record.id)

      // Texto da redação com indentação
      content = record.conteudo
        ? `<div class="redacao-texto">${addIndentToParagraphs(record.conteudo)}</div>`
        : ''

      dadosExtra = {
        textoRedacao: content,
        eixoTematico: record.eixo_tematico || '',
        autor: record.autor || '',
        fotoAutor: record.foto_autor || '',
        source_table: 'redacoes',
        source_id: record.id
      }
    }

    // Verificar se já existe post com mesmo source_id (idempotência)
    let blogPostId = record.blog_post_id
    if (!blogPostId) {
      const { data: existingPost } = await blogSupabase
        .from('posts')
        .select('id')
        .eq('dados_extra->>source_id', record.id)
        .eq('dados_extra->>source_table', table)
        .single()

      if (existingPost) {
        blogPostId = existingPost.id
      }
    }

    payload = {
      title,
      slug,
      content,
      excerpt: title.substring(0, 200),
      featured_image_url: featuredImage,
      author_id: Deno.env.get('BLOG_AUTHOR_ID') || '0503de5c-f9f9-49a1-89be-a89edc4c60be',
      tipo,
      status: 'published',
      published_at: new Date().toISOString(),
      dados_extra: dadosExtra,
      comments_enabled: true
    }

    // Upsert no Blog
    let blogResult
    if (blogPostId) {
      // UPDATE
      const { data, error } = await blogSupabase
        .from('posts')
        .update(payload)
        .eq('id', blogPostId)
        .select()
        .single()

      if (error) throw error
      blogResult = data
    } else {
      // INSERT
      const { data, error } = await blogSupabase
        .from('posts')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      blogResult = data
      blogPostId = data.id
    }

    // Atualizar blog_post_id no App
    await appSupabase
      .from(table)
      .update({
        blog_post_id: blogPostId,
        publicar_no_blog: true
      })
      .eq('id', record_id)

    return new Response(
      JSON.stringify({
        success: true,
        action: 'sync',
        blog_post_id: blogPostId,
        blog_post_slug: slug
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in sync-to-blog:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Utilitários
function generateSlug(title: string, id: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60)

  return `${slug}-${id.substring(0, 8)}`
}

function addIndentToParagraphs(html: string): string {
  return html.replace(/<p>/g, '<p style="text-indent: 2.5rem;">')
}
