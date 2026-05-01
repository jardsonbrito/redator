import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EnviarRequest {
  professorEmail: string;
  turmaId: string | null;
  autorNome: string;
  tema: string;
  imagemBase64?: string; // Opcional: se não enviada, vai direto para digitação manual
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
    }: EnviarRequest = await req.json();

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
      // 3.2. OCR com OpenAI Vision
      // ─────────────────────────────────────────────────────────
      console.log("🔍 Realizando OCR com OpenAI Vision...");

      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");

      const ocrResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia TODO o texto desta imagem de redação manuscrita. Transcreva EXATAMENTE como está escrito, mantendo parágrafos e quebras de linha. Retorne APENAS o texto transcrito, sem comentários ou análises.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                  detail: "high",
                },
              },
            ],
          }],
          max_tokens: 2000,
        }),
      });

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.text();
        console.error("❌ Erro no OCR:", errorData);
        throw new Error("Erro ao processar OCR da imagem");
      }

      const ocrData = await ocrResponse.json();
      transcricaoOCR = ocrData.choices?.[0]?.message?.content?.trim() ?? "";

      console.log("✅ OCR concluído");
      console.log(`📝 Texto extraído: ${transcricaoOCR.substring(0, 100)}...`);
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
