import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ──────────────────────────────────────────────────────────────────
// TIPOS
// ──────────────────────────────────────────────────────────────────

interface GerarRequest {
  tema_id: string;
}

interface LaboratorioGerado {
  titulo_aula: string;
  subtitulo_card: string;
  frase_tematica: string;
  eixos_tematicos: string[];
  repertorio: {
    nome_autor: string;
    obra_referencia: string;
    descricao_autor: string;
    ideia_central: string;
  };
  paragrafo_modelo: {
    tipo: "introducao" | "argumentativo" | "conclusao";
    texto: string;
    observacao_didatica: string;
  };
}

// ──────────────────────────────────────────────────────────────────
// CHAMADA À IA (Anthropic / OpenAI / Gemini)
// ──────────────────────────────────────────────────────────────────

async function callAI(
  provider: string,
  model: string,
  temperatura: number,
  maxTokens: number,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (provider === "anthropic") {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new Error("ANTHROPIC_API_KEY não configurada");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: maxTokens,
        temperature: temperatura,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${await res.text()}`);
    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Resposta vazia da Anthropic");
    return text;
  }

  if (provider === "openai") {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY não configurada");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: temperatura,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${await res.text()}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Resposta vazia da OpenAI");
    return text;
  }

  // Gemini
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY não configurada");
  const geminiModel = model.startsWith("gemini-") ? model : "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: temperatura,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${await res.text()}`);
  const data = await res.json();
  const allParts: any[] = data.candidates?.[0]?.content?.parts ?? [];
  const textParts = allParts.filter((p: any) => !p.thought && p.text);
  const text = (textParts.length > 0 ? textParts : allParts).map((p: any) => p.text ?? "").join("");
  if (!text) throw new Error("Resposta vazia do Gemini");
  return text;
}

// ──────────────────────────────────────────────────────────────────
// EXTRAÇÃO DE JSON ROBUSTO
// ──────────────────────────────────────────────────────────────────

function extrairJSON(texto: string): any {
  // Tenta parse direto
  try { return JSON.parse(texto); } catch { /* segue */ }

  // Remove blocos de código markdown
  const semMd = texto.replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, "$1").trim();
  try { return JSON.parse(semMd); } catch { /* segue */ }

  // Extrai primeiro objeto JSON encontrado
  const match = texto.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* segue */ }
  }

  throw new Error("Não foi possível extrair JSON válido da resposta da IA");
}

// ──────────────────────────────────────────────────────────────────
// PROMPT SYSTEM
// ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `Você é um especialista em pedagogia de redação ENEM e curador de repertório sociocultural.
Sua tarefa é gerar o conteúdo de uma "aula do Laboratório de Repertório" — um módulo guiado em 3 etapas (Contexto → Repertório → Aplicação) para alunos do ensino médio.

REGRAS DE REPERTÓRIO:
1. Escolha um repertório legítimo, pertinente ao tema e produtivo para argumentação.
2. O repertório pode ser: autor, filósofo, sociólogo, obra literária, obra teórica, conceito sociológico, documento legal, instituição ou pesquisa de órgão reconhecido, ou filme/série/documentário legitimável.
3. Evite repertórios vagos, decorativos ou improdutivos — o repertório precisa contribuir para o argumento.
4. O repertório deve ser compreensível para alunos do ensino médio.

REGRAS DO PARÁGRAFO MODELO:
O parágrafo deve conter, nessa ordem:
1. Tópico frasal (afirmação da tese)
2. Explicação/contextualização do problema
3. Repertório legitimado com autoria e obra
4. Aplicação ao contexto brasileiro
5. Aprofundamento crítico
6. Fechamento argumentativo

O repertório NÃO pode aparecer apenas como citação solta — deve ser efetivamente aplicado ao tema.

FORMATO DE SAÍDA:
Responda APENAS com um JSON válido, sem texto adicional, sem markdown, sem comentários.
O JSON deve seguir exatamente o schema especificado na mensagem do usuário.`;
}

function buildUserPrompt(tema: any): string {
  const textos: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const texto = tema[`texto_${i}`];
    const fonte = tema[`texto_${i}_fonte`];
    if (texto && texto.trim()) {
      textos.push(`Texto ${i}: ${texto.trim()}${fonte ? ` (Fonte: ${fonte})` : ""}`);
    }
  }

  return `Gere uma aula do Laboratório de Repertório com base no seguinte tema de redação ENEM:

FRASE TEMÁTICA: "${tema.frase_tematica}"
EIXO TEMÁTICO: "${tema.eixo_tematico || "Não informado"}"

${textos.length > 0 ? `TEXTOS MOTIVADORES:\n${textos.join("\n\n")}` : ""}

Responda com um JSON válido neste schema exato:
{
  "titulo_aula": "Nome do repertório ou autor principal (máx 60 chars)",
  "subtitulo_card": "Síntese curta mostrando a conexão com o tema (máx 150 chars)",
  "frase_tematica": "Repita a frase temática do tema acima",
  "eixos_tematicos": ["eixo1", "eixo2"],
  "repertorio": {
    "nome_autor": "Nome completo do autor, conceito, obra ou instituição",
    "obra_referencia": "Título da obra, conceito, dado, documento ou referência principal",
    "descricao_autor": "Descrição breve e didática do repertório em 2-3 frases para aluno do ensino médio",
    "ideia_central": "A ideia principal que o aluno deve guardar — 1 frase objetiva e memorável"
  },
  "paragrafo_modelo": {
    "tipo": "argumentativo",
    "texto": "Parágrafo ENEM completo (mínimo 8 linhas) aplicando o repertório ao tema, seguindo todas as regras pedagógicas",
    "observacao_didatica": "Explicação de 2-3 frases mostrando como o repertório foi conectado ao tema e o que o aluno deve aprender"
  }
}`;
}

// ──────────────────────────────────────────────────────────────────
// VALIDAÇÃO DO JSON GERADO
// ──────────────────────────────────────────────────────────────────

function validarGerado(obj: any): LaboratorioGerado {
  const erros: string[] = [];

  if (!obj.titulo_aula?.trim()) erros.push("titulo_aula ausente");
  if (!obj.subtitulo_card?.trim()) erros.push("subtitulo_card ausente");
  if (!obj.frase_tematica?.trim()) erros.push("frase_tematica ausente");
  if (!Array.isArray(obj.eixos_tematicos)) erros.push("eixos_tematicos deve ser array");
  if (!obj.repertorio?.nome_autor?.trim()) erros.push("repertorio.nome_autor ausente");
  if (!obj.repertorio?.obra_referencia?.trim()) erros.push("repertorio.obra_referencia ausente");
  if (!obj.repertorio?.descricao_autor?.trim()) erros.push("repertorio.descricao_autor ausente");
  if (!obj.repertorio?.ideia_central?.trim()) erros.push("repertorio.ideia_central ausente");
  if (!obj.paragrafo_modelo?.texto?.trim()) erros.push("paragrafo_modelo.texto ausente");
  if (!obj.paragrafo_modelo?.observacao_didatica?.trim()) erros.push("paragrafo_modelo.observacao_didatica ausente");

  if (erros.length > 0) {
    throw new Error(`JSON da IA inválido: ${erros.join(", ")}`);
  }

  const tipo = obj.paragrafo_modelo?.tipo;
  const tiposValidos = ["introducao", "argumentativo", "conclusao"];
  const tipoFinal = tiposValidos.includes(tipo) ? tipo : "argumentativo";

  return {
    titulo_aula: obj.titulo_aula.trim(),
    subtitulo_card: obj.subtitulo_card.trim(),
    frase_tematica: obj.frase_tematica.trim(),
    eixos_tematicos: (obj.eixos_tematicos as string[]).map((e: string) => e.trim()).filter(Boolean),
    repertorio: {
      nome_autor: obj.repertorio.nome_autor.trim(),
      obra_referencia: obj.repertorio.obra_referencia.trim(),
      descricao_autor: obj.repertorio.descricao_autor.trim(),
      ideia_central: obj.repertorio.ideia_central.trim(),
    },
    paragrafo_modelo: {
      tipo: tipoFinal as "introducao" | "argumentativo" | "conclusao",
      texto: obj.paragrafo_modelo.texto.trim(),
      observacao_didatica: obj.paragrafo_modelo.observacao_didatica.trim(),
    },
  };
}

// ──────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // Verifica usuário via JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se é admin
    const { data: adminData } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!adminData) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse do body
    const body: GerarRequest = await req.json();
    const { tema_id } = body;
    if (!tema_id) {
      return new Response(JSON.stringify({ error: "tema_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar duplicidade
    const { data: existente } = await supabase
      .from("repertorio_laboratorio")
      .select("id, titulo")
      .eq("tema_origem_id", tema_id)
      .maybeSingle();

    if (existente) {
      return new Response(
        JSON.stringify({
          already_exists: true,
          aula_id: existente.id,
          titulo: existente.titulo,
          message: "Este tema já possui uma aula de repertório vinculada.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Buscar dados completos do tema
    const { data: tema, error: temaError } = await supabase
      .from("temas")
      .select("id, frase_tematica, eixo_tematico, texto_1, texto_1_fonte, texto_2, texto_2_fonte, texto_3, texto_3_fonte, texto_4, texto_4_fonte, texto_5, texto_5_fonte")
      .eq("id", tema_id)
      .single();

    if (temaError || !tema) {
      return new Response(JSON.stringify({ error: "Tema não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar configuração de IA
    const { data: config } = await supabase
      .from("laboratorio_ia_config")
      .select("provider, model, temperatura, max_tokens")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const provider   = config?.provider  ?? "anthropic";
    const model      = config?.model     ?? "claude-3-5-sonnet-20241022";
    const temperatura = Number(config?.temperatura ?? 0.7);
    const maxTokens  = config?.max_tokens ?? 2000;

    console.log(`🤖 Gerando aula com ${provider}/${model} para tema: ${tema.frase_tematica}`);

    // Chamar IA
    const systemPrompt = buildSystemPrompt();
    const userPrompt   = buildUserPrompt(tema);
    const rawText      = await callAI(provider, model, temperatura, maxTokens, systemPrompt, userPrompt);

    // Parsear e validar JSON
    const rawObj  = extrairJSON(rawText);
    const gerado  = validarGerado(rawObj);

    // Inserir aula como rascunho
    const { data: novaAula, error: insertError } = await supabase
      .from("repertorio_laboratorio")
      .insert({
        titulo:                    gerado.titulo_aula,
        subtitulo:                 gerado.subtitulo_card,
        frase_tematica:            gerado.frase_tematica,
        eixos:                     gerado.eixos_tematicos,
        nome_autor:                gerado.repertorio.nome_autor,
        descricao_autor:           gerado.repertorio.descricao_autor,
        obra_referencia:           gerado.repertorio.obra_referencia,
        ideia_central:             gerado.repertorio.ideia_central,
        paragrafo_modelo:          gerado.paragrafo_modelo.texto,
        tipo_paragrafo:            gerado.paragrafo_modelo.tipo,
        observacao_paragrafo:      gerado.paragrafo_modelo.observacao_didatica,
        temas_sugeridos:           [tema_id],
        frases_tematicas_manuais:  [],
        ativo:                     false,      // rascunho — não visível para alunos
        gerado_por_ia:             true,
        tema_origem_id:            tema_id,
        ia_gerado_em:              new Date().toISOString(),
      })
      .select("id, titulo")
      .single();

    if (insertError || !novaAula) {
      console.error("Erro ao inserir aula:", insertError);
      throw new Error(`Erro ao salvar aula: ${insertError?.message}`);
    }

    console.log(`✅ Aula criada: ${novaAula.id} — "${novaAula.titulo}"`);

    return new Response(
      JSON.stringify({
        already_exists: false,
        aula_id:  novaAula.id,
        titulo:   novaAula.titulo,
        provider,
        model,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Erro na edge function:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
