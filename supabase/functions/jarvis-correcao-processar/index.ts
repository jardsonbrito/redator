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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
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

    // Validar campos obrigatórios da config
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

    // Validar status
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

    // Consumir crédito
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

    // Atualizar auditoria com correcao_id
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

    console.log("✅ Prompt montado" + (bancoBlocoPrompt ? " (com banco de comentários)" : ""));

    // ══════════════════════════════════════════════════════════════
    // 5. CHAMAR IA (OpenAI)
    // ══════════════════════════════════════════════════════════════
    console.log("🚀 Chamando OpenAI...");

    const startTime = Date.now();

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          temperature: parseFloat(String(config.temperatura)),
          max_tokens: config.max_tokens,
          messages: [
            { role: "system", content: config.system_prompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    const endTime = Date.now();
    const tempoProcessamento = endTime - startTime;

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("❌ Erro na OpenAI:", errorData);
      throw new Error(`Erro na OpenAI: ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    console.log("✅ Resposta da OpenAI recebida");
    console.log(`⏱️ Tempo: ${tempoProcessamento}ms`);
    console.log(`📊 Tokens: ${openaiData.usage.total_tokens}`);

    // Parse da resposta JSON
    let correcaoIA: CorrecaoIA;
    try {
      correcaoIA = JSON.parse(openaiData.choices[0].message.content);
    } catch (e) {
      console.error("❌ Erro ao parsear JSON da IA:", e);
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

    const validationErrors = validateCorrecaoIA(correcaoIA);
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
      config.model,
      openaiData.usage.prompt_tokens,
      openaiData.usage.completion_tokens
    );

    console.log(`💰 Custo estimado: $${custoEstimado.toFixed(6)}`);

    // ══════════════════════════════════════════════════════════════
    // 8. SALVAR CORREÇÃO COM RASTREABILIDADE COMPLETA
    // ══════════════════════════════════════════════════════════════
    console.log("💾 Salvando correção...");

    const { error: updateError } = await supabaseClient
      .from("jarvis_correcoes")
      .update({
        // Dados da correção
        transcricao_confirmada: transcricaoConfirmada,
        correcao_ia: correcaoIA,
        nota_total: correcaoIA.nota_total,
        nota_c1: correcaoIA.competencias.c1.nota,
        nota_c2: correcaoIA.competencias.c2.nota,
        nota_c3: correcaoIA.competencias.c3.nota,
        nota_c4: correcaoIA.competencias.c4.nota,
        nota_c5: correcaoIA.competencias.c5.nota,

        // Rastreabilidade da config usada
        config_id: config.id,
        config_versao: config.versao,
        provider: config.provider,
        modelo_ia: config.model,
        temperatura: config.temperatura,
        max_tokens: config.max_tokens,

        // Snapshots dos prompts (imutáveis - para auditoria)
        prompt_system_usado: config.system_prompt,
        prompt_user_usado: userPrompt,

        // Metadados técnicos
        tokens_input: openaiData.usage.prompt_tokens,
        tokens_output: openaiData.usage.completion_tokens,
        tokens_total: openaiData.usage.total_tokens,
        tempo_processamento_ms: tempoProcessamento,
        custo_estimado: custoEstimado,

        // Status
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
        tokens_usados: openaiData.usage.total_tokens,
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

    // Persistir erro no registro para facilitar diagnóstico
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

function validateCorrecaoIA(correcao: CorrecaoIA): string[] {
  const errors: string[] = [];

  // Validar campos obrigatórios
  if (!correcao.competencias) {
    errors.push("Campo 'competencias' ausente");
  }
  if (typeof correcao.nota_total !== "number") {
    errors.push("Campo 'nota_total' ausente ou inválido");
  }
  if (!Array.isArray(correcao.erros)) {
    errors.push("Campo 'erros' ausente ou não é array");
  }
  if (!correcao.estrutura) {
    errors.push("Campo 'estrutura' ausente");
  }
  if (!correcao.resumo_geral) {
    errors.push("Campo 'resumo_geral' ausente");
  }

  // Se campos básicos faltando, retornar já
  if (errors.length > 0) return errors;

  // Validar competências
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
      if (!c.justificativa) {
        errors.push(`Justificativa da ${comp} ausente`);
      }
    }
  }

  // Validar soma das competências = nota_total
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

  // Validar nota_total dentro do range
  if (correcao.nota_total < 0 || correcao.nota_total > 1000) {
    errors.push(`nota_total fora do intervalo 0-1000: ${correcao.nota_total}`);
  }

  return errors;
}

function calcularCusto(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Custos por 1M tokens (atualizado em 2024)
  const custos: Record<string, { input: number; output: number }> = {
    "gpt-4o-mini": { input: 0.15, output: 0.6 }, // $0.15/$0.60 per 1M tokens
    "gpt-4o": { input: 2.5, output: 10.0 }, // $2.50/$10.00 per 1M tokens
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 }, // $0.50/$1.50 per 1M tokens
  };

  const modelCost = custos[model] || custos["gpt-4o-mini"];

  const custoInput = (inputTokens / 1_000_000) * modelCost.input;
  const custoOutput = (outputTokens / 1_000_000) * modelCost.output;

  return custoInput + custoOutput;
}
