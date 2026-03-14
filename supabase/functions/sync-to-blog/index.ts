import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOG_AUTHOR_ID = "0503de5c-f9f9-49a1-89be-a89edc4c60be";

// ─── Utilitários ─────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 90);
}

function buildSlug(title: string, id: string): string {
  return `${slugify(title)}-${id.replace(/-/g, "").substring(0, 8)}`;
}

function mapStatus(appStatus: string | null | undefined): string {
  return appStatus === "publicado" || appStatus === "published" ? "published" : "draft";
}

function textToHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  return normalized
    .split(/\n{2,}/)
    .map((p) => `<p style="text-indent:1.25em">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Detecta o tipo de plataforma de vídeo pela URL.
 * Retorna: 'youtube' | 'instagram' | 'vimeo' | 'other'
 */
function detectVideoType(url: string): string {
  if (!url) return "other";
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/instagram\.com/.test(url)) return "instagram";
  if (/vimeo\.com/.test(url)) return "vimeo";
  return "other";
}

/**
 * Extrai o ID do vídeo do YouTube de qualquer formato de URL.
 * Retorna null para URLs não-YouTube.
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * Extrai o shortcode de um reel/post do Instagram.
 * Ex: https://www.instagram.com/reel/DQU289fkZmj/ → DQU289fkZmj
 */
function extractInstagramShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// ─── Validação de elegibilidade ──────────────────────────────────────────────

function validateEligibility(
  table: string,
  record: Record<string, unknown>
): string | null {
  if (table === "temas") {
    if (!(record.frase_tematica as string)?.trim()) return "Tema sem frase temática.";
    const hasTexto = [1,2,3,4,5].some((i) => (record[`texto_${i}`] as string)?.trim());
    if (!hasTexto) return "Tema precisa de ao menos um texto motivador para ser publicado no blog.";
    if (record.status !== "publicado") return "Tema não está publicado. Publique-o antes de sincronizar com o blog.";
  }
  if (table === "videos") {
    if (!(record.titulo as string)?.trim()) return "Vídeo sem título.";
    if (!(record.youtube_url as string)?.trim()) return "Vídeo sem URL.";
    if (record.status_publicacao !== "publicado") return "Vídeo não está publicado. Publique-o antes de sincronizar com o blog.";
  }
  if (table === "redacoes") {
    if (!(record.autor as string)?.trim()) return "Redação sem autor — apenas redações exemplares podem ser sincronizadas.";
    if (!(record.frase_tematica as string)?.trim()) return "Redação sem frase temática.";
    if (!(record.conteudo as string)?.trim()) return "Redação sem conteúdo.";
  }
  return null;
}

// ─── Payloads ────────────────────────────────────────────────────────────────

function buildTemaPayload(record: Record<string, unknown>, supabaseUrl: string) {
  const dadosExtra: Record<string, unknown> = {
    fraseTematica: record.frase_tematica,
    eixoTematico: record.eixo_tematico,
    source_table: "temas",
    source_id: record.id,
  };

  for (let i = 1; i <= 5; i++) {
    const texto = record[`texto_${i}`] as string | null;
    const fonte = record[`texto_${i}_fonte`] as string | null;
    if (texto?.trim()) {
      // FIX BUG 1: aplicar textToHtml para preservar múltiplos parágrafos
      const textoHtml = textToHtml(texto);
      dadosExtra[`motivador${i}`] = fonte ? `${textoHtml}<p><br></p><p>${fonte}</p>` : textoHtml;
    }
    const imgUrl = (record[`motivator${i}_url`] as string | null) ||
      (i === 4 ? (record.imagem_texto_4_url as string | null) : null);
    // FIX BUG 1 (imagem do motivador): também construir URL a partir do file_path
    const imgFilePath = record[`motivator${i}_file_path`] as string | null;
    const resolvedImgUrl = imgUrl ||
      (imgFilePath ? `${supabaseUrl}/storage/v1/object/public/themes/${imgFilePath}` : null);
    if (resolvedImgUrl) dadosExtra[`motivador${i}Url`] = resolvedImgUrl;
  }

  // FIX BUG 2: usar cover_file_path quando cover_url está vazio
  const coverUrl = (record.cover_url as string | null) ||
    (record.cover_file_path
      ? `${supabaseUrl}/storage/v1/object/public/themes/${record.cover_file_path}`
      : null);

  return {
    title: record.frase_tematica as string,
    slug: buildSlug(record.frase_tematica as string, record.id as string),
    content: "",
    featured_image_url: coverUrl,
    author_id: BLOG_AUTHOR_ID,
    tipo: "tema",
    status: mapStatus(record.status as string),
    published_at: (record.published_at as string | null) ?? null,
    dados_extra: dadosExtra,
  };
}

function buildVideoPayload(record: Record<string, unknown>) {
  const url = (record.youtube_url as string) ?? "";
  const tipoVideo = detectVideoType(url);
  const youtubeId = tipoVideo === "youtube" ? extractYouTubeId(url) : null;
  const instagramShortcode = tipoVideo === "instagram" ? extractInstagramShortcode(url) : null;

  return {
    title: record.titulo as string,
    slug: buildSlug(record.titulo as string, record.id as string),
    content: "",
    featured_image_url:
      (record.thumbnail_url as string | null) ?? (record.cover_url as string | null) ?? null,
    author_id: BLOG_AUTHOR_ID,
    tipo: "video",
    status: mapStatus(record.status_publicacao as string),
    published_at: (record.created_at as string | null) ?? null,
    dados_extra: {
      linkVideo: url,
      tipoVideo,
      youtubeId,
      instagramShortcode,
      eixoTematico: record.eixo_tematico ?? null,
      categoria: record.categoria ?? null,
      source_table: "videos",
      source_id: record.id,
    },
  };
}

function buildRedacaoPayload(record: Record<string, unknown>) {
  const conteudoHtml = textToHtml((record.conteudo as string) ?? "");
  const dadosExtra: Record<string, unknown> = {
    fraseTematica: record.frase_tematica,
    eixoTematico: record.eixo_tematico ?? null,
    textoRedacao: conteudoHtml,
    dicaDeEscrita: record.dica_de_escrita ?? null,
    autor: record.autor,
    fotoAutor: record.foto_autor ?? null,
    source_table: "redacoes",
    source_id: record.id,
  };
  if (record.nota_total) dadosExtra.notaTotal = record.nota_total;
  return {
    title: record.frase_tematica as string,
    slug: buildSlug(record.frase_tematica as string, record.id as string),
    content: conteudoHtml,
    featured_image_url: (record.pdf_url as string | null) ?? null,
    author_id: BLOG_AUTHOR_ID,
    tipo: "redacao_exemplar",
    status: "published",
    published_at: new Date().toISOString(),
    dados_extra: dadosExtra,
  };
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const jsonHeaders = { ...CORS_HEADERS, "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const appClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const blogClient = createClient(Deno.env.get("BLOG_SUPABASE_URL")!, Deno.env.get("BLOG_SERVICE_ROLE_KEY")!);

    // 1. Validar token
    const rawToken = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!rawToken) return new Response(JSON.stringify({ error: "Token ausente." }), { status: 401, headers: jsonHeaders });

    const { data: tokenRecord, error: tokenErr } = await appClient
      .from("admin_sync_tokens").select("id, used, expires_at").eq("token", rawToken).maybeSingle();

    if (tokenErr || !tokenRecord)
      return new Response(JSON.stringify({ error: "Token inválido." }), { status: 401, headers: jsonHeaders });
    if (tokenRecord.used || new Date(tokenRecord.expires_at) < new Date())
      return new Response(JSON.stringify({ error: "Token expirado ou já utilizado." }), { status: 401, headers: jsonHeaders });

    await appClient.from("admin_sync_tokens").update({ used: true }).eq("id", tokenRecord.id);

    // 2. Parse body
    const { table, record_id, action } = await req.json() as {
      table: "temas" | "videos" | "redacoes"; record_id: string; action: "sync" | "unsync";
    };
    if (!table || !record_id || !action)
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes." }), { status: 400, headers: jsonHeaders });
    if (!["temas","videos","redacoes"].includes(table))
      return new Response(JSON.stringify({ error: "Tabela inválida." }), { status: 400, headers: jsonHeaders });

    // 3. Buscar registro
    const { data: record, error: recordErr } = await appClient.from(table).select("*").eq("id", record_id).maybeSingle();
    if (recordErr || !record)
      return new Response(JSON.stringify({ error: "Registro não encontrado." }), { status: 404, headers: jsonHeaders });

    // 4. Unsync
    if (action === "unsync") {
      const blogPostId = record.blog_post_id as string | null;
      if (blogPostId)
        await blogClient.from("posts").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", blogPostId);
      await appClient.from(table).update({ publicar_no_blog: false, blog_post_id: null }).eq("id", record_id);
      return new Response(JSON.stringify({ success: true, message: "Post arquivado no blog." }), { headers: jsonHeaders });
    }

    // 5. Elegibilidade
    const eligibilityError = validateEligibility(table, record);
    if (eligibilityError)
      return new Response(JSON.stringify({ error: eligibilityError }), { status: 422, headers: jsonHeaders });

    // 6. Payload
    let payload: Record<string, unknown>;
    if (table === "temas") payload = buildTemaPayload(record, supabaseUrl);
    else if (table === "videos") payload = buildVideoPayload(record);
    else payload = buildRedacaoPayload(record);
    payload.updated_at = new Date().toISOString();

    // 7. Idempotência
    let blogPostId = record.blog_post_id as string | null;
    if (!blogPostId) {
      const { data: existing } = await blogClient.from("posts").select("id")
        .filter("dados_extra->>source_id", "eq", record_id).maybeSingle();
      if (existing) {
        blogPostId = existing.id as string;
        await appClient.from(table).update({ blog_post_id: blogPostId }).eq("id", record_id);
      }
    }

    // 8. Upsert
    let finalBlogPostId: string;
    if (blogPostId) {
      const updatePayload = { ...payload };
      if (updatePayload.status === "draft") delete updatePayload.status;
      const { error: updateErr } = await blogClient.from("posts").update(updatePayload).eq("id", blogPostId);
      if (updateErr) throw updateErr;
      finalBlogPostId = blogPostId;
    } else {
      const { data: inserted, error: insertErr } = await blogClient.from("posts").insert(payload).select("id").single();
      if (insertErr) throw insertErr;
      finalBlogPostId = inserted.id as string;
    }

    // 9. Salvar blog_post_id no App
    await appClient.from(table).update({ blog_post_id: finalBlogPostId, publicar_no_blog: true }).eq("id", record_id);

    return new Response(JSON.stringify({ success: true, blog_post_id: finalBlogPostId }), { headers: jsonHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno.";
    console.error("[sync-to-blog]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
