import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProcessarRequest {
  correcaoId: string;
  transcricaoConfirmada: string;
  professorEmail: string;
}

interface CorrecaoIA {
  competencias: {
    c1: { nota: number; justificativa: string; sugestoes?: string[] };
    c2: { nota: number; justificativa: string; sugestoes?: string[] };
    c3: { nota: number; justificativa: string; sugestoes?: string[] };
    c4: { nota: number; justificativa: string; sugestoes?: string[] };
    c5: { nota: number; justificativa: string; sugestoes?: string[] };
  };
  nota_total: number;
  erros: Array<{
    numero: number;
    tipo: string;
    competencia_relacionada?: "c1" | "c2" | "c3" | "c4" | "c5";
    descricao: string;
    trecho_original: string;
    sugestao: string;
  }>;
  estrutura: {
    possui_tese: boolean;
    tese_identificada: string;
    argumentos: string[];
    uso_repertorio: string;
    proposta_intervencao: string;
  };
  versao_lapidada?: string;
  sugestoes_objetivas?: string[];
  orientacoes_selecionadas?: Record<string, string[]>;
  resumo_geral: string;
}

interface BancoComentarioRow {
  competencia: string;
  categoria: string | null;
  texto: string;
}

interface ModeloReferenciaRow {
  titulo: string;
  tema: string;
  texto_aluno: string;
  nota_total: number;
  nota_c1: number;
  nota_c2: number;
  nota_c3: number;
  nota_c4: number;
  nota_c5: number;
  justificativa_c1: string | null;
  justificativa_c2: string | null;
  justificativa_c3: string | null;
  justificativa_c4: string | null;
  justificativa_c5: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let correcaoId: string | undefined;

  try {
    console.log("🤖 Jarvis Correção - Processando correção");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada");
    }

    const {
      correcaoId: cId,
      transcricaoConfirmada,
      professorEmail,
    }: ProcessarRequest = await req.json();

    correcaoId = cId;

    if (!cId || !transcricaoConfirmada || !professorEmail) {
      return new Response(
        JSON.stringify({
          error: "correcaoId, transcricaoConfirmada e professorEmail são obrigatórios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("📄 Correção ID:", correcaoId);
    console.log("👨‍🏫 Professor:", professorEmail);

    // ══════════════════════════════════════════════════════════════
    // 1. BUSCAR CONFIGURAÇÃO ATIVA (OBRIGATÓRIO - SEM FALLBACK!)
    // ══════════════════════════════════════════════════════════════
    console.log("📋 Buscando configuração ativa...");

    const { data: config, error: configError } = await supabaseClient
      .rpc("get_active_correcao_config")
      .single();

    if (configError || !config) {
      console.error("❌ CRÍTICO: Nenhuma configuração ativa encontrada");
      throw new Error(
        "SISTEMA BLOQUEADO: Nenhuma configuração de correção está ativa. Contate o administrador."
      );
    }

    console.log(`✅ Config ativa: v${config.versao} - ${config.nome}`);
    console.log(`🤖 Modelo: ${config.model} | Temp: ${config.temperatura}`);

    if (!config.system_prompt || !config.user_prompt_template) {
      throw new Error(
        "CONFIGURAÇÃO INVÁLIDA: system_prompt ou user_prompt_template ausentes"
      );
    }

    // ══════════════════════════════════════════════════════════════
    // 1.5 BUSCAR BANCO DE COMENTÁRIOS ATIVOS (OPCIONAL)
    // ══════════════════════════════════════════════════════════════
    console.log("📚 Buscando banco de comentários...");

    const { data: bancoComentarios } = await supabaseClient
      .from("jarvis_correcao_banco_comentarios")
      .select("competencia, categoria, texto")
      .eq("ativo", true)
      .order("criado_em", { ascending: true });

    const bancoBlocoPrompt = buildBancoBlock(bancoComentarios ?? []);
    console.log(`📚 Banco: ${(bancoComentarios ?? []).length} comentários ativos`);

    // ══════════════════════════════════════════════════════════════
    // 1.7 BUSCAR MODELOS DE REFERÊNCIA ATIVOS (FEW-SHOT)
    // ══════════════════════════════════════════════════════════════
    console.log("📖 Buscando modelos de referência...");

    const { data: modelosReferencia } = await supabaseClient
      .from("jarvis_correcao_modelos_referencia")
      .select(
        "titulo, tema, texto_aluno, nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, justificativa_c1, justificativa_c2, justificativa_c3, justificativa_c4, justificativa_c5"
      )
      .eq("ativo", true)
      .order("prioridade", { ascending: false })
      .limit(2);

    const fewShotBloco = buildFewShotBlock(modelosReferencia ?? []);
    console.log(`📖 Modelos de referência: ${(modelosReferencia ?? []).length} carregados`);

    // ══════════════════════════════════════════════════════════════
    // 2. BUSCAR CORREÇÃO
    // ══════════════════════════════════════════════════════════════
    const { data: correcao, error: correcaoError } = await supabaseClient
      .from("jarvis_correcoes")
      .select("*")
      .eq("id", correcaoId)
      .single();

    if (correcaoError || !correcao) {
      throw new Error("Correção não encontrada");
    }

    console.log("📝 Tema:", correcao.tema);
    console.log("👤 Aluno:", correcao.autor_nome);

    if (correcao.status === "corrigida") {
      throw new Error("Esta correção já foi processada");
    }

    // ══════════════════════════════════════════════════════════════
    // 3. BUSCAR PROFESSOR E CONSUMIR CRÉDITO
    // ══════════════════════════════════════════════════════════════
    const { data: professor, error: professorError } = await supabaseClient
      .from("professores")
      .select("id, jarvis_correcao_creditos, nome_completo")
      .eq("email", professorEmail.toLowerCase().trim())
      .eq("ativo", true)
      .single();

    if (professorError || !professor) {
      throw new Error("Professor não encontrado");
    }

    console.log(
      `👨‍🏫 Professor: ${professor.nome_completo} | Créditos: ${professor.jarvis_correcao_creditos}`
    );

    const { data: creditResult, error: creditError } = await supabaseClient.rpc(
      "consumir_credito_professor",
      {
        professor_id_param: professor.id,
        quantidade: config.custo_creditos,
      }
    );

    if (creditError || !creditResult?.success) {
      console.error("❌ Erro ao consumir crédito:", creditError || creditResult);
      throw new Error(
        creditResult?.error || "Erro ao consumir créditos. Verifique seu saldo."
      );
    }

    console.log(
      `💳 Crédito consumido: ${creditResult.creditos_anteriores} → ${creditResult.creditos_atuais}`
    );

    await supabaseClient
      .from("jarvis_correcao_credit_audit")
      .update({ correcao_id: correcaoId })
      .eq("professor_id", professor.id)
      .is("correcao_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    // ══════════════════════════════════════════════════════════════
    // 4. MONTAR PROMPT DINAMICAMENTE
    // ══════════════════════════════════════════════════════════════
    console.log("📝 Montando prompt a partir do template...");

    let userPrompt = config.user_prompt_template
      .replace(/\{tema\}/g, correcao.tema)
      .replace(/\{texto\}/g, transcricaoConfirmada);

    if (bancoBlocoPrompt) {
      userPrompt += bancoBlocoPrompt;
    }

    // Modelos de referência são concatenados ao system_prompt (calibração few-shot)
    const systemPromptFinal = fewShotBloco
      ? config.system_prompt + "\n\n" + fewShotBloco
      : config.system_prompt;

    const temFewShot = !!fewShotBloco;
    const temBanco = !!bancoBlocoPrompt;
    console.log(
      `✅ Prompt montado` +
      (temBanco ? " (+ banco de comentários)" : "") +
      (temFewShot ? " (+ few-shot de referência)" : "")
    );

    // ══════════════════════════════════════════════════════════════
    // 5. CHAMAR IA (Gemini)
    // ══════════════════════════════════════════════════════════════
    console.log("🚀 Chamando Gemini...");

    const startTime = Date.now();
    const geminiModel = config.model.startsWith("gemini-") ? config.model : "gemini-2.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;

    const generationConfig: Record<string, any> = {
      temperature: parseFloat(String(config.temperatura)),
      maxOutputTokens: config.max_tokens,
      responseMimeType: "application/json",
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPromptFinal }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig,
      }),
    });

    const endTime = Date.now();
    const tempoProcessamento = endTime - startTime;

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error("❌ Erro no Gemini:", errorData);
      throw new Error(`Erro no Gemini: ${errorData}`);
    }

    const geminiData = await geminiResponse.json();
    const parts: any[] = geminiData.candidates?.[0]?.content?.parts ?? [];
    const geminiText = parts[0]?.text;
    if (!geminiText) throw new Error("Resposta vazia ou inválida do Gemini");
    console.log(`✅ Resposta recebida | ${tempoProcessamento}ms | total=${geminiData.usageMetadata?.totalTokenCount ?? "N/A"} tokens`);

    let correcaoIA: CorrecaoIA;
    try {
      correcaoIA = JSON.parse(geminiText);
    } catch (e) {
      console.error("❌ JSON inválido:", (e as Error).message);
      console.error("Prévia (500 chars):", geminiText?.substring(0, 500));
      throw new Error("Resposta da IA não está em formato JSON válido");
    }

    // Recalcular nota_total a partir das competências (o modelo às vezes erra a soma)
    if (correcaoIA.competencias) {
      const soma =
        (correcaoIA.competencias.c1?.nota ?? 0) +
        (correcaoIA.competencias.c2?.nota ?? 0) +
        (correcaoIA.competencias.c3?.nota ?? 0) +
        (correcaoIA.competencias.c4?.nota ?? 0) +
        (correcaoIA.competencias.c5?.nota ?? 0);
      if (typeof correcaoIA.nota_total !== "number" || correcaoIA.nota_total !== soma) {
        console.log(`⚠️ nota_total corrigida: ${correcaoIA.nota_total} → ${soma}`);
        correcaoIA.nota_total = soma;
      }
    }

    // ══════════════════════════════════════════════════════════════
    // 6. VALIDAR RESPOSTA
    // ══════════════════════════════════════════════════════════════
    console.log("🔍 Validando resposta da IA...");

    const validationErrors = validateCorrecaoIA(correcaoIA!, config.versao);
    if (validationErrors.length > 0) {
      console.error("❌ Validação falhou:", validationErrors);
      throw new Error(
        `Resposta da IA não passou na validação: ${validationErrors.join(", ")}`
      );
    }

    console.log("✅ Resposta válida");
    console.log(`📊 Nota total: ${correcaoIA.nota_total}`);

    // ══════════════════════════════════════════════════════════════
    // 7. CALCULAR CUSTO
    // ══════════════════════════════════════════════════════════════
    const custoEstimado = calcularCusto(
      geminiModel,
      geminiData.usageMetadata?.promptTokenCount ?? 0,
      geminiData.usageMetadata?.candidatesTokenCount ?? 0
    );

    console.log(`💰 Custo estimado: $${custoEstimado.toFixed(6)}`);

    // ══════════════════════════════════════════════════════════════
    // 8. SALVAR CORREÇÃO COM RASTREABILIDADE COMPLETA
    // ══════════════════════════════════════════════════════════════
    console.log("💾 Salvando correção...");

    const { error: updateError } = await supabaseClient
      .from("jarvis_correcoes")
      .update({
        transcricao_confirmada: transcricaoConfirmada,
        correcao_ia: correcaoIA!,
        nota_total: correcaoIA.nota_total,
        nota_c1: correcaoIA.competencias.c1.nota,
        nota_c2: correcaoIA.competencias.c2.nota,
        nota_c3: correcaoIA.competencias.c3.nota,
        nota_c4: correcaoIA.competencias.c4.nota,
        nota_c5: correcaoIA.competencias.c5.nota,

        config_id: config.id,
        config_versao: config.versao,
        provider: config.provider,
        modelo_ia: config.model,
        temperatura: config.temperatura,
        max_tokens: config.max_tokens,

        // Snapshot dos prompts efetivamente enviados (inclui few-shot se houver)
        prompt_system_usado: systemPromptFinal,
        prompt_user_usado: userPrompt,

        tokens_input: geminiData.usageMetadata?.promptTokenCount ?? 0,
        tokens_output: geminiData.usageMetadata?.candidatesTokenCount ?? 0,
        tokens_total: geminiData.usageMetadata?.totalTokenCount ?? 0,
        tempo_processamento_ms: tempoProcessamento,
        custo_estimado: custoEstimado,

        // Campos de versionamento: correção original é sempre versão 1 do seu próprio grupo
        grupo_id: correcaoId,
        numero_versao: 1,
        is_versao_principal: true,
        tipo_correcao: "original",

        status: "corrigida",
        corrigida_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", correcaoId);

    if (updateError) {
      console.error("❌ Erro ao salvar correção:", updateError);
      throw new Error("Erro ao salvar correção no banco de dados");
    }

    console.log("✅ Correção salva com sucesso!");

    // ══════════════════════════════════════════════════════════════
    // 9. RETORNAR RESULTADO
    // ══════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        success: true,
        correcaoId,
        nota_total: correcaoIA.nota_total,
        config_versao: config.versao,
        tokens_usados: geminiData.usageMetadata?.totalTokenCount ?? 0,
        tempo_processamento_ms: tempoProcessamento,
        custo_estimado: custoEstimado,
        creditos_restantes: creditResult.creditos_atuais,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Erro:", error);

    if (correcaoId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await supabaseClient
          .from("jarvis_correcoes")
          .update({ status: "erro", erro_mensagem: error.message || "Erro desconhecido" })
          .eq("id", correcaoId);
      } catch { /* silencia falha no log de erro */ }
    }

    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao processar correção",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ══════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ══════════════════════════════════════════════════════════════════

function buildBancoBlock(banco: BancoComentarioRow[]): string {
  if (!banco.length) return "";

  const grupos: Record<string, string[]> = {};
  for (const item of banco) {
    if (!grupos[item.competencia]) grupos[item.competencia] = [];
    grupos[item.competencia].push(item.texto);
  }

  const labels: Record<string, string> = {
    geral: "ORIENTAÇÕES GERAIS",
    c1: "C1 — Norma Padrão",
    c2: "C2 — Temática e Repertório",
    c3: "C3 — Argumentação",
    c4: "C4 — Coesão e Coerência",
    c5: "C5 — Proposta de Intervenção",
  };
  const ordem = ["geral", "c1", "c2", "c3", "c4", "c5"];

  let bloco = "\n\n---\nBANCO DE ORIENTAÇÕES PEDAGÓGICAS:\n";
  bloco += "Após realizar a correção completa, analise quais das orientações abaixo se aplicam ESPECIFICAMENTE a esta redação.\n";
  bloco += "Inclua no JSON de resposta o campo \"orientacoes_selecionadas\" com um objeto onde as chaves são as competências (c1, c2, c3, c4, c5, geral) e os valores são arrays com os textos EXATOS das orientações aplicáveis.\n";
  bloco += "Selecione apenas as que realmente se aplicam ao texto analisado. Omita chaves de competências sem orientações aplicáveis. NÃO invente orientações além das listadas.\n\n";

  for (const comp of ordem) {
    const itens = grupos[comp];
    if (!itens?.length) continue;
    bloco += `[${labels[comp]}]\n`;
    for (const texto of itens) {
      bloco += `- ${texto}\n`;
    }
    bloco += "\n";
  }

  bloco += "---";
  return bloco;
}

function buildFewShotBlock(modelos: ModeloReferenciaRow[]): string {
  if (!modelos.length) return "";

  let bloco = "\n\n---\n# EXEMPLOS DE REFERÊNCIA (Calibração do padrão de correção)\n";
  bloco += "Use os exemplos abaixo como referência do padrão esperado para notas e justificativas. Calibre sua avaliação em relação a esses modelos.\n\n";

  for (let i = 0; i < modelos.length; i++) {
    const m = modelos[i];
    const textoResumido = m.texto_aluno.length > 600
      ? m.texto_aluno.substring(0, 600) + "..."
      : m.texto_aluno;

    bloco += `## Exemplo ${i + 1}: ${m.titulo}\n`;
    bloco += `**Tema:** ${m.tema}\n\n`;
    bloco += `**Texto do aluno (trecho):**\n"${textoResumido}"\n\n`;
    bloco += `**Gabarito de notas:** Total: ${m.nota_total} | C1: ${m.nota_c1} | C2: ${m.nota_c2} | C3: ${m.nota_c3} | C4: ${m.nota_c4} | C5: ${m.nota_c5}\n`;

    if (m.justificativa_c1) bloco += `**Justificativa C1:** ${m.justificativa_c1}\n`;
    if (m.justificativa_c2) bloco += `**Justificativa C2:** ${m.justificativa_c2}\n`;
    if (m.justificativa_c3) bloco += `**Justificativa C3:** ${m.justificativa_c3}\n`;
    if (m.justificativa_c4) bloco += `**Justificativa C4:** ${m.justificativa_c4}\n`;
    if (m.justificativa_c5) bloco += `**Justificativa C5:** ${m.justificativa_c5}\n`;
    bloco += "\n";
  }

  bloco += "---";
  return bloco;
}

function validateCorrecaoIA(correcao: CorrecaoIA, configVersao?: number): string[] {
  const errors: string[] = [];

  if (!correcao.competencias) errors.push("Campo 'competencias' ausente");
  if (typeof correcao.nota_total !== "number") errors.push("Campo 'nota_total' ausente ou inválido");
  if (!Array.isArray(correcao.erros)) errors.push("Campo 'erros' ausente ou não é array");
  if (!correcao.estrutura) errors.push("Campo 'estrutura' ausente");
  if (!correcao.resumo_geral) errors.push("Campo 'resumo_geral' ausente");

  if (errors.length > 0) return errors;

  const competencias = ["c1", "c2", "c3", "c4", "c5"];
  for (const comp of competencias) {
    const c = (correcao.competencias as any)[comp];
    if (!c) {
      errors.push(`Competência '${comp}' ausente`);
    } else {
      if (typeof c.nota !== "number") {
        errors.push(`Nota da ${comp} ausente ou inválida`);
      } else if (c.nota < 0 || c.nota > 200) {
        errors.push(`Nota da ${comp} fora do intervalo 0-200: ${c.nota}`);
      }
      if (!c.justificativa) errors.push(`Justificativa da ${comp} ausente`);
    }
  }

  const soma =
    correcao.competencias.c1.nota +
    correcao.competencias.c2.nota +
    correcao.competencias.c3.nota +
    correcao.competencias.c4.nota +
    correcao.competencias.c5.nota;

  if (Math.abs(soma - correcao.nota_total) > 1) {
    errors.push(
      `Soma das competências (${soma}) diferente da nota_total (${correcao.nota_total})`
    );
  }

  if (correcao.nota_total < 0 || correcao.nota_total > 1000) {
    errors.push(`nota_total fora do intervalo 0-1000: ${correcao.nota_total}`);
  }

  // A partir da config v2, exigir competencia_relacionada em cada erro
  const exigirCompRelacionada = (configVersao ?? 1) >= 2;
  if (exigirCompRelacionada && Array.isArray(correcao.erros)) {
    const compValidas = ["c1", "c2", "c3", "c4", "c5"];
    correcao.erros.forEach((erro: any, idx: number) => {
      if (!erro.competencia_relacionada) {
        errors.push(`Erro ${idx + 1}: campo 'competencia_relacionada' ausente`);
      } else if (!compValidas.includes(erro.competencia_relacionada)) {
        errors.push(
          `Erro ${idx + 1}: 'competencia_relacionada' inválido: "${erro.competencia_relacionada}"`
        );
      }
    });
  }

  return errors;
}

function calcularCusto(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const custos: Record<string, { input: number; output: number }> = {
    "gemini-2.5-flash-preview-04-17": { input: 0.15, output: 0.60 },
    "gemini-2.5-flash-preview": { input: 0.15, output: 0.60 },
    "gemini-2.5-pro-preview-03-25": { input: 1.25, output: 10.0 },
    "gemini-2.5-pro-preview": { input: 1.25, output: 10.0 },
    "gemini-2.0-flash": { input: 0.10, output: 0.40 },
    "gemini-1.5-flash": { input: 0.075, output: 0.30 },
    "gemini-1.5-pro": { input: 3.5, output: 10.5 },
  };

  const modelCost = custos[model] || custos["gemini-1.5-flash"];
  const custoInput = (inputTokens / 1_000_000) * modelCost.input;
  const custoOutput = (outputTokens / 1_000_000) * modelCost.output;

  return custoInput + custoOutput;
}
