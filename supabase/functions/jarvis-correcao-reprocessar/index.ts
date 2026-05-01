import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReprocessarRequest {
  correcaoId: string;
  professorEmail: string;
  observacao?: string;
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

  try {
    console.log("🔄 Jarvis Recorreção - Iniciando revisão");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const { correcaoId, professorEmail, observacao }: ReprocessarRequest = await req.json();

    if (!correcaoId || !professorEmail) {
      return new Response(
        JSON.stringify({ error: "correcaoId e professorEmail são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📄 Correção original ID:", correcaoId);
    console.log("👨‍🏫 Professor:", professorEmail);

    // ══════════════════════════════════════════════════════════════
    // 1. BUSCAR CONFIGURAÇÃO ATIVA
    // ══════════════════════════════════════════════════════════════
    const { data: config, error: configError } = await supabaseClient
      .rpc("get_active_correcao_config")
      .single();

    if (configError || !config) {
      throw new Error("SISTEMA BLOQUEADO: Nenhuma configuração de correção está ativa.");
    }

    console.log(`✅ Config ativa: v${config.versao} - ${config.nome}`);

    // ══════════════════════════════════════════════════════════════
    // 1.5 BANCO DE COMENTÁRIOS
    // ══════════════════════════════════════════════════════════════
    const { data: bancoComentarios } = await supabaseClient
      .from("jarvis_correcao_banco_comentarios")
      .select("competencia, categoria, texto")
      .eq("ativo", true)
      .order("criado_em", { ascending: true });

    const bancoBlocoPrompt = buildBancoBlock(bancoComentarios ?? []);

    // ══════════════════════════════════════════════════════════════
    // 1.7 MODELOS DE REFERÊNCIA (FEW-SHOT)
    // ══════════════════════════════════════════════════════════════
    const { data: modelosReferencia } = await supabaseClient
      .from("jarvis_correcao_modelos_referencia")
      .select(
        "titulo, tema, texto_aluno, nota_total, nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, justificativa_c1, justificativa_c2, justificativa_c3, justificativa_c4, justificativa_c5"
      )
      .eq("ativo", true)
      .order("prioridade", { ascending: false })
      .limit(2);

    const fewShotBloco = buildFewShotBlock(modelosReferencia ?? []);

    // ══════════════════════════════════════════════════════════════
    // 2. BUSCAR CORREÇÃO ORIGINAL
    // ══════════════════════════════════════════════════════════════
    const { data: original, error: originalError } = await supabaseClient
      .from("jarvis_correcoes")
      .select("*")
      .eq("id", correcaoId)
      .single();

    if (originalError || !original) {
      throw new Error("Correção original não encontrada");
    }

    if (original.status !== "corrigida") {
      throw new Error("Só é possível revisar correções com status 'corrigida'");
    }

    const textoParaRevisar = original.transcricao_confirmada || original.transcricao_ocr_original;
    if (!textoParaRevisar) {
      throw new Error("Texto da redação não encontrado na correção original");
    }

    console.log("📝 Tema:", original.tema);
    console.log("👤 Aluno:", original.autor_nome);
    console.log("📋 Grupo:", original.grupo_id);

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

    if (professor.id !== original.professor_id) {
      throw new Error("Sem permissão para revisar esta correção");
    }

    console.log(`👨‍🏫 ${professor.nome_completo} | Créditos: ${professor.jarvis_correcao_creditos}`);

    const { data: creditResult, error: creditError } = await supabaseClient.rpc(
      "consumir_credito_professor",
      { professor_id_param: professor.id, quantidade: config.custo_creditos }
    );

    if (creditError || !creditResult?.success) {
      throw new Error(creditResult?.error || "Erro ao consumir créditos. Verifique seu saldo.");
    }

    console.log(`💳 Crédito consumido: ${creditResult.creditos_anteriores} → ${creditResult.creditos_atuais}`);

    // ══════════════════════════════════════════════════════════════
    // 4. MONTAR PROMPT COM OBSERVAÇÃO DO PROFESSOR (SE HOUVER)
    // ══════════════════════════════════════════════════════════════
    let userPrompt = config.user_prompt_template
      .replace(/\{tema\}/g, original.tema)
      .replace(/\{texto\}/g, textoParaRevisar);

    if (bancoBlocoPrompt) userPrompt += bancoBlocoPrompt;

    const observacaoTrimmed = observacao?.trim() || "";
    if (observacaoTrimmed) {
      userPrompt +=
        "\n\n---\nOBSERVAÇÃO DO PROFESSOR PARA ESTA REVISÃO:\n" +
        observacaoTrimmed +
        "\n\nConsidere essa observação ao revisar a correção anterior, mas mantenha a avaliação baseada nos critérios do Laboratório do Redator e na matriz ENEM.\n---";
    }

    const systemPromptFinal = fewShotBloco
      ? config.system_prompt + "\n\n" + fewShotBloco
      : config.system_prompt;

    console.log(
      "✅ Prompt montado" +
      (observacaoTrimmed ? " (+ observação do professor)" : "") +
      (bancoBlocoPrompt ? " (+ banco)" : "") +
      (fewShotBloco ? " (+ few-shot)" : "")
    );

    // ══════════════════════════════════════════════════════════════
    // 5. CHAMAR IA (Gemini)
    // ══════════════════════════════════════════════════════════════
    console.log("🚀 Chamando Gemini...");

    const startTime = Date.now();
    const geminiModel = config.model.startsWith("gemini-") ? config.model : "gemini-2.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;

    const supportsThinking = /2\.[5-9]|[3-9]\./.test(geminiModel);
    const generationConfig: Record<string, any> = {
      temperature: parseFloat(String(config.temperatura)),
      maxOutputTokens: config.max_tokens,
    };
    if (supportsThinking) generationConfig.thinkingConfig = { thinkingBudget: -1 };

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
      throw new Error(`Erro no Gemini: ${errorData}`);
    }

    const geminiData = await geminiResponse.json();
    // Modelos com thinking retornam múltiplas parts; a de conteúdo não tem `thought: true`
    const parts: any[] = geminiData.candidates?.[0]?.content?.parts ?? [];
    const geminiText = parts.find((p) => !p.thought)?.text;
    if (!geminiText) throw new Error("Resposta vazia ou inválida do Gemini");
    const thoughtsTokens = geminiData.usageMetadata?.thoughtsTokenCount ?? 0;
    console.log(`✅ Resposta recebida | ${tempoProcessamento}ms | total=${geminiData.usageMetadata?.totalTokenCount ?? "N/A"} tokens | pensamento=${thoughtsTokens}`);

    let correcaoIA: CorrecaoIA;
    try {
      let jsonText = geminiText.trim();
      // Modelos com thinking retornam JSON embrulhado em ```json ... ```
      const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonText = fenceMatch[1].trim();
      correcaoIA = JSON.parse(jsonText);
    } catch (e) {
      console.error("❌ Erro ao parsear JSON da IA:", e);
      console.error("Texto recebido (500 chars):", geminiText?.substring(0, 500));
      throw new Error("Resposta da IA não está em formato JSON válido");
    }

    // Recalcular nota_total a partir das competências
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
    const validationErrors = validateCorrecaoIA(correcaoIA, config.versao);
    if (validationErrors.length > 0) {
      throw new Error(`Resposta da IA não passou na validação: ${validationErrors.join(", ")}`);
    }

    console.log(`✅ Válida | Nota: ${correcaoIA.nota_total}`);

    // ══════════════════════════════════════════════════════════════
    // 7. CALCULAR CUSTO
    // ══════════════════════════════════════════════════════════════
    const custoEstimado = calcularCusto(
      geminiModel,
      geminiData.usageMetadata?.promptTokenCount ?? 0,
      geminiData.usageMetadata?.candidatesTokenCount ?? 0
    );

    // ══════════════════════════════════════════════════════════════
    // 8. DETERMINAR PRÓXIMO NÚMERO DE VERSÃO
    // ══════════════════════════════════════════════════════════════
    const grupoId = original.grupo_id ?? original.id;

    const { data: ultimaVersao } = await supabaseClient
      .from("jarvis_correcoes")
      .select("numero_versao")
      .eq("grupo_id", grupoId)
      .order("numero_versao", { ascending: false })
      .limit(1)
      .single();

    const proximaVersao = (ultimaVersao?.numero_versao ?? 1) + 1;
    console.log(`📋 Versão: ${proximaVersao} (grupo ${grupoId})`);

    // ══════════════════════════════════════════════════════════════
    // 9. MARCAR TODAS AS VERSÕES ANTERIORES COMO NÃO-PRINCIPAL
    // ══════════════════════════════════════════════════════════════
    const { error: updatePrincipalError } = await supabaseClient
      .from("jarvis_correcoes")
      .update({ is_versao_principal: false })
      .eq("grupo_id", grupoId);

    if (updatePrincipalError) {
      throw new Error("Erro ao atualizar versões anteriores");
    }

    // ══════════════════════════════════════════════════════════════
    // 10. INSERIR NOVA VERSÃO
    // ══════════════════════════════════════════════════════════════
    const agora = new Date().toISOString();

    const { data: novaCorrecao, error: insertError } = await supabaseClient
      .from("jarvis_correcoes")
      .insert({
        professor_id: original.professor_id,
        turma_id: original.turma_id,
        autor_nome: original.autor_nome,
        tema: original.tema,
        imagem_url: original.imagem_url,
        transcricao_ocr_original: original.transcricao_ocr_original,
        transcricao_confirmada: textoParaRevisar,

        grupo_id: grupoId,
        numero_versao: proximaVersao,
        is_versao_principal: true,
        tipo_correcao: "recorrecao",
        motivo_recorrecao: observacaoTrimmed || null,
        solicitada_por: professorEmail,

        correcao_ia: correcaoIA,
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

        prompt_system_usado: systemPromptFinal,
        prompt_user_usado: userPrompt,

        tokens_input: geminiData.usageMetadata?.promptTokenCount ?? 0,
        tokens_output: geminiData.usageMetadata?.candidatesTokenCount ?? 0,
        tokens_total: geminiData.usageMetadata?.totalTokenCount ?? 0,
        tempo_processamento_ms: tempoProcessamento,
        custo_estimado: custoEstimado,

        status: "corrigida",
        corrigida_em: agora,
        atualizado_em: agora,
      })
      .select("id")
      .single();

    if (insertError || !novaCorrecao) {
      throw new Error("Erro ao salvar nova versão da correção");
    }

    console.log("✅ Nova versão salva:", novaCorrecao.id);

    return new Response(
      JSON.stringify({
        success: true,
        novaCorrecaoId: novaCorrecao.id,
        nota_total: correcaoIA.nota_total,
        numero_versao: proximaVersao,
        config_versao: config.versao,
        tokens_usados: geminiData.usageMetadata?.totalTokenCount ?? 0,
        tempo_processamento_ms: tempoProcessamento,
        custo_estimado: custoEstimado,
        creditos_restantes: creditResult.creditos_atuais,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar revisão" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ══════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES (idênticas ao processar)
// ══════════════════════════════════════════════════════════════════

function buildBancoBlock(banco: BancoComentarioRow[]): string {
  if (!banco.length) return "";
  const grupos: Record<string, string[]> = {};
  for (const item of banco) {
    if (!grupos[item.competencia]) grupos[item.competencia] = [];
    grupos[item.competencia].push(item.texto);
  }
  const labels: Record<string, string> = {
    geral: "ORIENTAÇÕES GERAIS", c1: "C1 — Norma Padrão", c2: "C2 — Temática e Repertório",
    c3: "C3 — Argumentação", c4: "C4 — Coesão e Coerência", c5: "C5 — Proposta de Intervenção",
  };
  const ordem = ["geral", "c1", "c2", "c3", "c4", "c5"];
  let bloco = "\n\n---\nBANCO DE ORIENTAÇÕES PEDAGÓGICAS:\n";
  bloco += "Após realizar a correção completa, analise quais das orientações abaixo se aplicam ESPECIFICAMENTE a esta redação.\n";
  bloco += "Inclua no JSON de resposta o campo \"orientacoes_selecionadas\" com as aplicáveis. NÃO invente orientações além das listadas.\n\n";
  for (const comp of ordem) {
    const itens = grupos[comp];
    if (!itens?.length) continue;
    bloco += `[${labels[comp]}]\n`;
    for (const texto of itens) bloco += `- ${texto}\n`;
    bloco += "\n";
  }
  bloco += "---";
  return bloco;
}

function buildFewShotBlock(modelos: ModeloReferenciaRow[]): string {
  if (!modelos.length) return "";
  let bloco = "\n\n---\n# EXEMPLOS DE REFERÊNCIA (Calibração do padrão de correção)\n";
  bloco += "Use os exemplos abaixo como referência do padrão esperado para notas e justificativas.\n\n";
  for (let i = 0; i < modelos.length; i++) {
    const m = modelos[i];
    const texto = m.texto_aluno.length > 600 ? m.texto_aluno.substring(0, 600) + "..." : m.texto_aluno;
    bloco += `## Exemplo ${i + 1}: ${m.titulo}\n**Tema:** ${m.tema}\n\n**Texto:** "${texto}"\n\n`;
    bloco += `**Gabarito:** Total: ${m.nota_total} | C1: ${m.nota_c1} | C2: ${m.nota_c2} | C3: ${m.nota_c3} | C4: ${m.nota_c4} | C5: ${m.nota_c5}\n`;
    if (m.justificativa_c1) bloco += `**C1:** ${m.justificativa_c1}\n`;
    if (m.justificativa_c2) bloco += `**C2:** ${m.justificativa_c2}\n`;
    if (m.justificativa_c3) bloco += `**C3:** ${m.justificativa_c3}\n`;
    if (m.justificativa_c4) bloco += `**C4:** ${m.justificativa_c4}\n`;
    if (m.justificativa_c5) bloco += `**C5:** ${m.justificativa_c5}\n`;
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
  const comps = ["c1", "c2", "c3", "c4", "c5"];
  for (const comp of comps) {
    const c = (correcao.competencias as any)[comp];
    if (!c) { errors.push(`Competência '${comp}' ausente`); continue; }
    if (typeof c.nota !== "number") errors.push(`Nota da ${comp} inválida`);
    else if (c.nota < 0 || c.nota > 200) errors.push(`Nota ${comp} fora de 0-200: ${c.nota}`);
    if (!c.justificativa) errors.push(`Justificativa ${comp} ausente`);
  }
  const soma = correcao.competencias.c1.nota + correcao.competencias.c2.nota +
    correcao.competencias.c3.nota + correcao.competencias.c4.nota + correcao.competencias.c5.nota;
  if (Math.abs(soma - correcao.nota_total) > 1) {
    errors.push(`Soma das competências (${soma}) diferente de nota_total (${correcao.nota_total})`);
  }
  if (correcao.nota_total < 0 || correcao.nota_total > 1000) {
    errors.push(`nota_total fora de 0-1000: ${correcao.nota_total}`);
  }
  const exigirCompRelacionada = (configVersao ?? 1) >= 2;
  if (exigirCompRelacionada && Array.isArray(correcao.erros)) {
    const validas = ["c1", "c2", "c3", "c4", "c5"];
    correcao.erros.forEach((erro: any, idx: number) => {
      if (!erro.competencia_relacionada) errors.push(`Erro ${idx + 1}: 'competencia_relacionada' ausente`);
      else if (!validas.includes(erro.competencia_relacionada)) {
        errors.push(`Erro ${idx + 1}: 'competencia_relacionada' inválido: "${erro.competencia_relacionada}"`);
      }
    });
  }
  return errors;
}

function calcularCusto(model: string, inputTokens: number, outputTokens: number): number {
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
  return (inputTokens / 1_000_000) * modelCost.input + (outputTokens / 1_000_000) * modelCost.output;
}
