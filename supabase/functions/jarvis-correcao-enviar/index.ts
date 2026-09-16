import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EnviarRequest {
  // Caminho professor (existente)
  professorEmail?: string;
  turmaId?: string | null;
  autorNome?: string;
  tema?: string;
  imagemBase64?: string;
  // Caminho admin (novo) — pré-correção de redação digitada
  adminId?: string;
  redacaoEnviadaId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📤 Jarvis Correção - Enviar Redação");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      professorEmail,
      turmaId,
      autorNome,
      tema,
      imagemBase64,
      adminId,
      redacaoEnviadaId,
    }: EnviarRequest = await req.json();

    const ehAdmin = !!adminId && !professorEmail;

    // ══════════════════════════════════════════════════════════════
    // CAMINHO ADMIN — pré-correção de redação digitada
    // ══════════════════════════════════════════════════════════════
    if (ehAdmin) {
      console.log("🔑 Modo admin — pré-correção");

      if (!adminId || !redacaoEnviadaId) {
        return new Response(
          JSON.stringify({ error: "adminId e redacaoEnviadaId são obrigatórios no modo admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validar admin
      const { data: admin, error: adminError } = await supabaseClient
        .from("admin_users")
        .select("id")
        .eq("id", adminId)
        .single();

      if (adminError || !admin) {
        return new Response(
          JSON.stringify({ error: "Admin não encontrado" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verificar duplicata: impede re-envio se já existe pré-correção não-erro
      const { data: existente } = await supabaseClient
        .from("jarvis_correcoes")
        .select("id, status")
        .eq("redacao_enviada_id", redacaoEnviadaId)
        .eq("is_pre_correcao", true)
        .eq("is_versao_principal", true)
        .neq("status", "erro")
        .maybeSingle();

      if (existente) {
        return new Response(
          JSON.stringify({
            error: "ja_existe_pre_correcao",
            correcaoId: existente.id,
            status: existente.status,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar dados da redação enviada
      const { data: redacao, error: redacaoError } = await supabaseClient
        .from("redacoes_enviadas")
        .select("id, nome_aluno, frase_tematica, redacao_texto, redacao_manuscrita_url")
        .eq("id", redacaoEnviadaId)
        .single();

      if (redacaoError || !redacao) {
        throw new Error("Redação não encontrada");
      }

      if (redacao.redacao_manuscrita_url) {
        return new Response(
          JSON.stringify({ error: "Redações manuscritas não suportam pré-correção pelo Jarvis" }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Criar registro de pré-correção
      const { data: novaCorrecao, error: correcaoError } = await supabaseClient
        .from("jarvis_correcoes")
        .insert({
          professor_id: null,
          admin_id: adminId,
          redacao_enviada_id: redacaoEnviadaId,
          origem_tipo: "admin",
          is_pre_correcao: true,
          autor_nome: redacao.nome_aluno,
          tema: redacao.frase_tematica,
          transcricao_confirmada: redacao.redacao_texto,
          status: "aguardando_correcao",
          grupo_id: null, // será preenchido pela RPC ou com o próprio id após inserção
        })
        .select()
        .single();

      if (correcaoError || !novaCorrecao) {
        console.error("❌ Erro ao criar pré-correção:", correcaoError);
        throw new Error("Erro ao salvar pré-correção no banco de dados");
      }

      // grupo_id = id do próprio registro (primeira versão)
      await supabaseClient
        .from("jarvis_correcoes")
        .update({ grupo_id: novaCorrecao.id })
        .eq("id", novaCorrecao.id);

      console.log("✅ Pré-correção criada:", novaCorrecao.id);

      return new Response(
        JSON.stringify({
          success: true,
          correcaoId: novaCorrecao.id,
          status: "aguardando_correcao",
          transcricaoConfirmada: redacao.redacao_texto,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // CAMINHO PROFESSOR (existente, inalterado)
    // ══════════════════════════════════════════════════════════════

    // Validações básicas
    if (!professorEmail || !autorNome || !tema) {
      return new Response(
        JSON.stringify({
          error: "professorEmail, autorNome e tema são obrigatórios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("👨‍🏫 Professor:", professorEmail);
    console.log("👤 Aluno:", autorNome);
    console.log("📝 Tema:", tema);

    // ══════════════════════════════════════════════════════════════
    // 1. BUSCAR E VALIDAR PROFESSOR
    // ══════════════════════════════════════════════════════════════
    const { data: professor, error: professorError } = await supabaseClient
      .from("professores")
      .select("id, nome_completo, jarvis_correcao_creditos")
      .eq("email", professorEmail.toLowerCase().trim())
      .eq("ativo", true)
      .single();

    if (professorError || !professor) {
      throw new Error("Professor não encontrado ou inativo");
    }

    console.log(`✅ Professor: ${professor.nome_completo}`);
    console.log(`💳 Créditos disponíveis: ${professor.jarvis_correcao_creditos}`);

    // Validar que tem pelo menos 1 crédito
    if (professor.jarvis_correcao_creditos < 1) {
      return new Response(
        JSON.stringify({
          error: "Créditos insuficientes",
          creditos_disponiveis: professor.jarvis_correcao_creditos,
        }),
        {
          status: 402, // Payment Required
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // 2. VALIDAR TURMA (se fornecida)
    // ══════════════════════════════════════════════════════════════
    if (turmaId) {
      const { data: turma, error: turmaError } = await supabaseClient
        .from("turmas_professores")
        .select("id, nome")
        .eq("id", turmaId)
        .single();

      if (turmaError || !turma) {
        throw new Error("Turma não encontrada");
      }

      console.log(`📚 Turma: ${turma.nome}`);
    }

    // ══════════════════════════════════════════════════════════════
    // 3-PRE. BUSCAR CONFIG ATIVA (para ocr_model)
    // ══════════════════════════════════════════════════════════════
    const { data: configAtiva } = await supabaseClient
      .from("jarvis_correcao_config")
      .select("ocr_model")
      .eq("ativo", true)
      .single();

    const ocrModel = configAtiva?.ocr_model ?? "gpt-4o";
    console.log(`🤖 Modelo OCR: ${ocrModel}`);

    let imagemUrl: string | null = null;
    let transcricaoOCR: string | null = null;
    let statusInicial = "revisao_ocr"; // Padrão: aguarda revisão

    // ══════════════════════════════════════════════════════════════
    // 3. PROCESSAR IMAGEM (se fornecida)
    // ══════════════════════════════════════════════════════════════
    if (imagemBase64) {
      console.log("🖼️ Processando imagem...");

      // ─────────────────────────────────────────────────────────
      // 3.1. Upload da imagem para Storage
      // ─────────────────────────────────────────────────────────
      const fileName = `${crypto.randomUUID()}.jpg`;
      const filePath = `${professor.id}/${fileName}`;

      // Converter base64 para blob
      const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("redacoes-professores")
        .upload(filePath, buffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Erro no upload:", uploadError);
        throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
      }

      // Obter URL pública
      const { data: urlData } = supabaseClient.storage
        .from("redacoes-professores")
        .getPublicUrl(filePath);

      imagemUrl = urlData.publicUrl;
      console.log("✅ Imagem salva:", imagemUrl);

      // ─────────────────────────────────────────────────────────
      // 3.2. OCR com Vision (OpenAI ou Gemini)
      // ─────────────────────────────────────────────────────────
      console.log(`🔍 Realizando OCR com ${ocrModel}...`);

      const ocrPrompt = `Você é um sistema de OCR literal para redações manuscritas.

Sua única tarefa é transcrever exatamente o que está visível na imagem, preservando o texto do aluno como documento original.

REGRAS ABSOLUTAS:
1. Não corrija nada.
2. Não melhore nada.
3. Não interprete a intenção do aluno.
4. Não reconstrua lógica argumentativa.
5. Não complete frases incompletas.
6. Não reorganize períodos, parágrafos ou ideias.
7. Não acrescente conectivos.
8. Não substitua palavras por sinônimos.
9. Não corrija ortografia, acentuação, pontuação, concordância, regência, crase ou colocação pronominal.
10. Não ajuste tese, repertório, argumentação, coesão ou proposta de intervenção.
11. Não transforme frases truncadas em frases completas.
12. Não apague repetições, rasuras, informalidades, ambiguidades ou incoerências.
13. Não suavize trechos confusos.
14. Não normalize a escrita para a norma-padrão.
15. Não faça avaliação da redação.

A transcrição deve preservar, na medida do possível:
- erros ortográficos;
- ausência ou excesso de pontuação;
- palavras repetidas;
- frases incompletas;
- truncamentos;
- incoerências;
- quebras de parágrafo;
- ordem original das ideias;
- marcas textuais visíveis.

Se uma palavra estiver ilegível, escreva [ilegível].
Se uma palavra estiver parcialmente legível, transcreva a parte identificável e use [ilegível] no trecho duvidoso.
Se houver dúvida entre duas leituras possíveis, use a forma visualmente mais provável seguida de [?].

Exemplos:
- Se estiver escrito "caza", transcreva "caza", não "casa".
- Se estiver escrito "concerteza", transcreva "concerteza", não "com certeza".
- Se estiver escrito "os problema", transcreva "os problema", não "os problemas".
- Se a frase estiver truncada, mantenha o truncamento.
- Se o aluno repetir uma palavra, mantenha a repetição.

FORMATO DE SAÍDA:
Retorne somente a transcrição.
Não inclua comentários, análise, nota, correções ou explicações.`;

      const isGemini = ocrModel.startsWith("gemini");

      let ocrText = "";

      if (isGemini) {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${ocrModel}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: ocrPrompt },
                  { inline_data: { mime_type: "image/jpeg", data: base64Data } },
                ],
              }],
              generationConfig: { maxOutputTokens: 2000 },
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorData = await geminiResponse.text();
          console.error("❌ Erro no OCR Gemini:", errorData);
          throw new Error("Erro ao processar OCR com Gemini");
        }

        const geminiData = await geminiResponse.json();
        ocrText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      } else {
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");

        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: ocrModel,
            messages: [{
              role: "user",
              content: [
                { type: "text", text: ocrPrompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Data}`, detail: "high" },
                },
              ],
            }],
            max_tokens: 2000,
          }),
        });

        if (!openaiResponse.ok) {
          const errorData = await openaiResponse.text();
          console.error("❌ Erro no OCR OpenAI:", errorData);
          throw new Error("Erro ao processar OCR com OpenAI");
        }

        const openaiData = await openaiResponse.json();
        ocrText = openaiData.choices?.[0]?.message?.content?.trim() ?? "";
      }

      // Se o modelo retornou texto vazio (falha silenciosa, filtro de segurança etc.),
      // trata como digitação manual em vez de mostrar tela de revisão com textarea vazio.
      if (!ocrText.trim()) {
        console.warn("⚠️ OCR retornou texto vazio — alternando para digitação manual");
        transcricaoOCR = null;
        statusInicial = "aguardando_correcao";
      } else {
        transcricaoOCR = ocrText;
        console.log("✅ OCR concluído");
        console.log(`📝 Texto extraído: ${transcricaoOCR.substring(0, 100)}...`);
      }
    } else {
      // Se não tem imagem, status é aguardando transcrição manual
      console.log("⚠️ Sem imagem - redação será digitada manualmente");
      statusInicial = "aguardando_correcao"; // Vai direto para digitação
    }

    // ══════════════════════════════════════════════════════════════
    // 4. CRIAR REGISTRO DE CORREÇÃO
    // ══════════════════════════════════════════════════════════════
    console.log("💾 Criando registro de correção...");

    const { data: novaCorrecao, error: correcaoError } = await supabaseClient
      .from("jarvis_correcoes")
      .insert({
        professor_id: professor.id,
        turma_id: turmaId,
        autor_nome: autorNome,
        tema: tema,
        imagem_url: imagemUrl,
        transcricao_ocr_original: transcricaoOCR,
        transcricao_confirmada: null, // Será preenchida após revisão
        status: statusInicial,
      })
      .select()
      .single();

    if (correcaoError) {
      console.error("❌ Erro ao criar correção:", correcaoError);
      throw new Error("Erro ao salvar correção no banco de dados");
    }

    console.log("✅ Correção criada:", novaCorrecao.id);

    // ══════════════════════════════════════════════════════════════
    // 5. RETORNAR RESULTADO
    // ══════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        success: true,
        correcaoId: novaCorrecao.id,
        imagemUrl: imagemUrl,
        transcricaoOCR: transcricaoOCR,
        status: statusInicial,
        mensagem:
          statusInicial === "revisao_ocr"
            ? "Imagem processada! Revise a transcrição antes de enviar para correção."
            : "Redação registrada! Digite o texto para correção.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao processar envio",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
