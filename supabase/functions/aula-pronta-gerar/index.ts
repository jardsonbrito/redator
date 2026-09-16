import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NivelTurma = "Iniciante" | "Intermediário" | "Avançado";
type TipoMaterial = "plano_aula" | "quiz" | "questao_aberta";

interface PlanoAulaParams {
  tema: string;
  objetivo?: string;
  duracao: "30 min" | "60 min" | "120 min";
  habilidade?: string;
  tipo_conducao: string;
  tipo_conducao_outro?: string;
  atividade_final: string[];
  atividade_final_livre?: string;
  materiais: string[];
  materiais_outro?: string;
  observacoes?: string;
}

interface QuizParams {
  conteudo: string;
  quantidade_questoes: number;
  quantidade_alternativas: 4 | 5;
}

interface QuestaoAbertaParams {
  conteudo: string;
  quantidade_questoes: number;
}

interface AulaProntaRequest {
  professorEmail: string;
  tipo: TipoMaterial;
  nivel: NivelTurma;
  parametros: PlanoAulaParams | QuizParams | QuestaoAbertaParams;
}

function buildSystemPrompt(): string {
  return `Você é um especialista em pedagogia de redação para o ENEM (Exame Nacional do Ensino Médio).
Sua missão é criar materiais pedagógicos de alta qualidade para professores de redação brasileiros.
Seja claro, didático e prático. Use formatação em Markdown para estruturar o conteúdo.
Escreva sempre em português do Brasil.`;
}

function buildPlanoAulaPrompt(nivel: NivelTurma, p: PlanoAulaParams): string {
  const conducao = p.tipo_conducao === "Outro" && p.tipo_conducao_outro
    ? p.tipo_conducao_outro
    : p.tipo_conducao;

  const atividadeFinal = [
    ...p.atividade_final,
    ...(p.atividade_final_livre ? [p.atividade_final_livre] : []),
  ].join(", ");

  const materiais = [
    ...p.materiais,
    ...(p.materiais_outro ? [p.materiais_outro] : []),
  ].join(", ");

  return `Crie um **plano de aula completo** para uma turma de nível **${nivel}** com as seguintes especificações:

- **Tema/Conteúdo:** ${p.tema}
${p.objetivo ? `- **Objetivo da aula:** ${p.objetivo}` : ""}
- **Duração:** ${p.duracao}
${p.habilidade ? `- **Habilidade a trabalhar:** ${p.habilidade}` : ""}
- **Tipo de condução:** ${conducao}
- **Atividade final:** ${atividadeFinal || "Livre"}
- **Materiais e recursos:** ${materiais || "Quadro e giz"}
${p.observacoes ? `- **Observações adicionais:** ${p.observacoes}` : ""}

Estruture o plano com estas seções obrigatórias:

## 🎯 Objetivos de Aprendizagem
## 📋 Desenvolvimento da Aula
(divida em etapas com tempo estimado para cada uma, totalizando ${p.duracao})
## ✏️ Atividade Final
## 📚 Materiais Necessários
## 📊 Avaliação / Critérios de Sucesso

Seja específico, detalhado e prático. O plano deve ser aplicável imediatamente em sala de aula.`;
}

function buildQuizPrompt(nivel: NivelTurma, p: QuizParams): string {
  const letrasFim = p.quantidade_alternativas === 5 ? "a) até e)" : "a) até d)";
  return `Crie um **quiz de múltipla escolha** com **${p.quantidade_questoes} questão(ões)** sobre o tema abaixo para uma turma de nível **${nivel}**:

**Conteúdo:** ${p.conteudo}

Cada questão deve ter:
- Enunciado claro e objetivo
- ${p.quantidade_alternativas} alternativas (${letrasFim})
- Apenas uma alternativa correta
- Gabarito indicado ao final de cada questão
- Breve justificativa da resposta correta

Formate cada questão assim:

---
**Questão N**

[Enunciado]

a) [opção]
b) [opção]
c) [opção]
d) [opção]
${p.quantidade_alternativas === 5 ? "e) [opção]\n" : ""}
**Gabarito:** Letra X
**Justificativa:** [explicação]

---

Certifique-se que as questões avaliam compreensão real, não apenas memorização.`;
}

function buildQuestaoAbertaPrompt(nivel: NivelTurma, p: QuestaoAbertaParams): string {
  return `Crie **${p.quantidade_questoes} questão(ões) discursiva(s)** sobre o tema abaixo para uma turma de nível **${nivel}**:

**Conteúdo:** ${p.conteudo}

Para cada questão inclua:
- Enunciado bem elaborado, com contexto quando necessário
- Critérios de avaliação (o que o professor deve observar na resposta)
- Resposta esperada ou gabarito comentado

Formate cada questão assim:

---
**Questão N**

[Enunciado completo]

**Critérios de avaliação:**
- [critério 1]
- [critério 2]

**Resposta esperada:**
[resposta model ou pontos essenciais que devem ser abordados]

---`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let professorId: string | null = null;
  let creditoConsumido = false;

  try {
    const body: AulaProntaRequest = await req.json();
    const { professorEmail, tipo, nivel, parametros } = body;

    if (!professorEmail || !tipo || !nivel || !parametros) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros obrigatórios ausentes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar professor e validar créditos
    const { data: professor, error: profErr } = await supabase
      .from("professores")
      .select("id, nome_completo, jarvis_correcao_creditos")
      .eq("email", professorEmail.toLowerCase().trim())
      .eq("ativo", true)
      .single();

    if (profErr || !professor) {
      return new Response(
        JSON.stringify({ success: false, error: "Professor não encontrado ou inativo." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    professorId = professor.id;

    if ((professor.jarvis_correcao_creditos ?? 0) < 1) {
      return new Response(
        JSON.stringify({ success: false, error: "Créditos insuficientes. Adquira mais créditos para usar a Aula Pronta." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construir prompt conforme tipo
    const systemPrompt = buildSystemPrompt();
    let userPrompt: string;

    if (tipo === "plano_aula") {
      userPrompt = buildPlanoAulaPrompt(nivel, parametros as PlanoAulaParams);
    } else if (tipo === "quiz") {
      userPrompt = buildQuizPrompt(nivel, parametros as QuizParams);
    } else if (tipo === "questao_aberta") {
      userPrompt = buildQuestaoAbertaPrompt(nivel, parametros as QuestaoAbertaParams);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Tipo de material inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chamar Claude API
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`Erro na API de IA: ${errText}`);
    }

    const aiData = await aiRes.json();
    const conteudo = aiData.content?.[0]?.text;

    if (!conteudo || conteudo.trim().length < 50) {
      throw new Error("Resposta da IA vazia ou incompleta.");
    }

    // Sucesso validado — debitar crédito
    const { data: creditResult, error: creditErr } = await supabase.rpc(
      "consumir_credito_professor",
      { professor_id_param: professor.id, quantidade: 1 }
    );

    if (creditErr || !creditResult?.success) {
      throw new Error(creditResult?.error || "Erro ao consumir créditos.");
    }

    creditoConsumido = true;

    return new Response(
      JSON.stringify({
        success: true,
        conteudo,
        creditos_restantes: creditResult.creditos_atuais,
        creditos_consumidos: 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Aula Pronta erro:", error);

    // Rollback de crédito se foi debitado antes da persistência
    if (creditoConsumido && professorId) {
      try {
        await supabase.rpc("devolver_credito_professor", {
          professor_id_param: professorId,
          quantidade: 1,
          motivo: `Falha na geração de material: ${error.message ?? "Erro desconhecido"}`,
        });
      } catch { /* silencia */ }
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro ao gerar material." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
