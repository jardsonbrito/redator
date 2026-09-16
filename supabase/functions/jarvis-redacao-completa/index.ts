import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedacaoCompletaRequest {
  userEmail: string;
  modoId: string;
  tema: string;
  creditosNecessarios: number;
}

function contarPalavras(texto: string): number {
  return texto.split(/\s+/).filter(p => p.trim()).length;
}

function secaoRegras(calibracao: any): string {
  let s = '';
  const regras = calibracao.regras_composicao;
  if (!regras) return s;
  if (regras.nivel_concisao) s += `• Concisão: ${regras.nivel_concisao}\n`;
  if (regras.tom) s += `• Tom: ${regras.tom}\n`;
  if (regras.coesivos_sugeridos?.length)
    s += `• Coesivos sugeridos: ${regras.coesivos_sugeridos.join(', ')}\n`;
  if (regras.restricoes?.length) {
    s += `• Restrições:\n`;
    regras.restricoes.forEach((r: string) => { s += `  - ${r}\n`; });
  }
  return s;
}

function secaoModelos(modelos: any[], titulo: string): string {
  if (!modelos || modelos.length === 0) return '';
  let s = `\n[Modelos de referência para ${titulo}]\n`;
  modelos.slice(0, 2).forEach((m, i) => {
    s += `Exemplo ${i + 1} (${m.palavras} palavras):\n${m.texto_modelo}\n\n`;
  });
  return s;
}

function construirPromptCompleto(
  calibIntro: any,
  calibDev: any,
  calibConc: any,
  modelosIntro: any[],
  modelosDev: any[],
  modelosConc: any[],
  tema: string
): string {
  // Estrutura períodos da introdução
  const defaultPeriodosIntro = [
    '1º período: Repertório sociocultural + interpretação integrada ao tema',
    '2º período: Contextualização problematizada no Brasil',
    '3º período: Tese por causalidade mencionando EXPLICITAMENTE os 2 aspectos',
  ];
  const estruturaPeriodosIntro: string[] =
    calibIntro.regras_composicao?.estrutura_periodos ?? defaultPeriodosIntro;

  // Elementos da célula argumentativa do desenvolvimento
  const criteriosDev = calibDev.criterios_celula_argumentativa;
  const chaveParaDesc: Record<string, string> = {
    validar_topico_frasal: 'topico_frasal',
    validar_explicacao: 'explicacao',
    validar_embasamento: 'embasamento',
    validar_aplicacao_tema: 'aplicacao_tema',
    validar_causalidade: 'causalidade',
    validar_aprofundamento: 'aprofundamento',
  };
  const descricoesPadraoOrdem = [
    ['topico_frasal', 'Tópico frasal: sentença de abertura com o argumento central'],
    ['explicacao', 'Explicação: desenvolvimento do argumento'],
    ['embasamento', 'Embasamento: dado, citação ou exemplo'],
    ['aplicacao_tema', 'Aplicação ao tema: conexão com o tema proposto'],
    ['causalidade', 'Causalidade: relação causa-efeito'],
  ];

  let elementosDev = '';
  if (criteriosDev) {
    Object.entries(chaveParaDesc).forEach(([chaveValidar, chaveDesc]) => {
      if (criteriosDev[chaveValidar]) {
        const desc = criteriosDev.descricoes?.[chaveDesc] ??
          descricoesPadraoOrdem.find(([k]) => k === chaveDesc)?.[1] ?? chaveDesc;
        elementosDev += `  • ${desc}\n`;
      }
    });
  } else {
    elementosDev = `  • Tópico frasal, Explicação, Embasamento, Aplicação ao tema, Causalidade\n`;
  }

  // Elementos C5 da conclusão
  const criteriosConc = calibConc.criterios_proposta_intervencao;
  const descricoesPadraoC5: Record<string, string> = {
    agente: 'Agente: entidade responsável pela proposta',
    acao: 'Ação: o que deve ser feito',
    meio_modo: 'Meio/Modo: como a ação será executada',
    finalidade: 'Finalidade: objetivo final',
    detalhamento: 'Detalhamento: especificação concreta',
  };
  const elementosObrigatoriosConc: string[] =
    criteriosConc?.elementos_obrigatorios || ['agente', 'acao', 'finalidade'];
  const todosElementosConc: string[] =
    criteriosConc?.elementos_c5 || ['agente', 'acao', 'meio_modo', 'finalidade', 'detalhamento'];

  let elementosConc = '';
  todosElementosConc.forEach((el: string) => {
    const obrigatorio = elementosObrigatoriosConc.includes(el);
    const desc = criteriosConc?.descricoes?.[el] ?? descricoesPadraoC5[el] ?? el;
    elementosConc += `    ${obrigatorio ? '✓ OBRIGATÓRIO' : '○ recomendado'} — ${desc}\n`;
  });

  const prompt = `Você é Jarvis, assistente de redação ENEM do Laboratório do Redator.

Gere uma REDAÇÃO COMPLETA dissertativo-argumentativa para o ENEM, com EXATAMENTE 4 parágrafos:
1 Introdução + 2 Parágrafos de Desenvolvimento + 1 Conclusão.

TEMA DA REDAÇÃO: "${tema}"

══════════════════════════════════════════════════════════
BLOCO 1 — INTRODUÇÃO
══════════════════════════════════════════════════════════

Parâmetros estruturais:
• Número EXATO de períodos: ${calibIntro.periodos_exatos}
• Extensão: ${calibIntro.palavras_min}–${calibIntro.palavras_max} palavras
• Estrutura obrigatória:
${estruturaPeriodosIntro.map(p => `  ${p}`).join('\n')}

Regras de composição:
${secaoRegras(calibIntro)}${calibIntro.instrucoes_geracao ? `\nInstruções adicionais: ${calibIntro.instrucoes_geracao}\n` : ''}${secaoModelos(modelosIntro, 'introdução')}
══════════════════════════════════════════════════════════
BLOCO 2 — DESENVOLVIMENTO (2 parágrafos distintos)
══════════════════════════════════════════════════════════

Parâmetros estruturais para CADA parágrafo:
• Número EXATO de períodos: ${calibDev.periodos_exatos}
• Extensão: ${calibDev.palavras_min}–${calibDev.palavras_max} palavras por parágrafo
• Estrutura da célula argumentativa:
${elementosDev}
Os 2 parágrafos devem abordar ASPECTOS CAUSAIS DIFERENTES do tema.

Regras de composição:
${secaoRegras(calibDev)}${calibDev.instrucoes_geracao ? `\nInstruções adicionais: ${calibDev.instrucoes_geracao}\n` : ''}${secaoModelos(modelosDev, 'desenvolvimento')}
══════════════════════════════════════════════════════════
BLOCO 3 — CONCLUSÃO
══════════════════════════════════════════════════════════

Parâmetros estruturais:
• Número EXATO de períodos: ${calibConc.periodos_exatos}
• Extensão: ${calibConc.palavras_min}–${calibConc.palavras_max} palavras
• Estrutura obrigatória:${criteriosConc?.verificar_retomada_tese ? '\n  • 1º período: Retomada sintética da tese' : ''}
  • Proposta de intervenção com elementos C5:
${elementosConc}
Regras de composição:
${secaoRegras(calibConc)}${calibConc.instrucoes_geracao ? `\nInstruções adicionais: ${calibConc.instrucoes_geracao}\n` : ''}${secaoModelos(modelosConc, 'conclusão')}
══════════════════════════════════════════════════════════
VALIDAÇÃO INTERNA (faça antes de retornar):
══════════════════════════════════════════════════════════

Antes de finalizar, VERIFIQUE:
1. A introdução tem EXATAMENTE ${calibIntro.periodos_exatos} períodos (${calibIntro.palavras_min}–${calibIntro.palavras_max} palavras)?
2. Cada parágrafo de desenvolvimento tem EXATAMENTE ${calibDev.periodos_exatos} períodos (${calibDev.palavras_min}–${calibDev.palavras_max} palavras)?
3. Os 2 parágrafos de desenvolvimento abordam aspectos causais DISTINTOS?
4. A conclusão tem EXATAMENTE ${calibConc.periodos_exatos} períodos (${calibConc.palavras_min}–${calibConc.palavras_max} palavras)?
5. A proposta de intervenção contém: ${elementosObrigatoriosConc.join(', ')}?

Se qualquer resposta for NÃO, REFAÇA antes de retornar.

══════════════════════════════════════════════════════════

Retorne JSON com EXATAMENTE estas chaves:
{
  "introducao": "Texto completo da introdução",
  "desenvolvimento_1": "Texto completo do 1º parágrafo de desenvolvimento",
  "desenvolvimento_2": "Texto completo do 2º parágrafo de desenvolvimento",
  "conclusao": "Texto completo da conclusão"
}`;

  return prompt;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📝 Jarvis - Redação Completa - Iniciando');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada');

    const { userEmail, modoId, tema, creditosNecessarios }: RedacaoCompletaRequest = await req.json();

    if (!userEmail || !modoId || !tema || !creditosNecessarios) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios faltando' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar tema da redação
    const temaLimpo = tema.trim();
    const temaPalavras = temaLimpo.split(/\s+/).filter(Boolean);
    if (temaLimpo.length < 20 || temaPalavras.length < 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tema inválido. Digite uma frase temática completa com pelo menos 3 palavras.',
          tema_invalido: true,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Email:', userEmail, '| Tema:', tema.substring(0, 50));

    // ── Buscar usuário ─────────────────────────────────────────────
    const { data: user, error: userError } = await supabaseClient
      .from('profiles')
      .select('id, jarvis_creditos, nome')
      .eq('email', userEmail.toLowerCase().trim())
      .eq('user_type', 'aluno')
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((user.jarvis_creditos || 0) < creditosNecessarios) {
      return new Response(
        JSON.stringify({
          error: 'Créditos Jarvis insuficientes',
          creditos_atuais: user.jarvis_creditos || 0,
          creditos_necessarios: creditosNecessarios
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Buscar subtabs do modo ─────────────────────────────────────
    const { data: subtabs, error: subtabsError } = await supabaseClient
      .from('jarvis_tutoria_subtabs')
      .select('id, nome')
      .eq('modo_id', modoId)
      .eq('habilitada', true)
      .in('nome', ['introducao', 'desenvolvimento', 'conclusao']);

    if (subtabsError || !subtabs || subtabs.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Subtabs de calibração não encontradas ou incompletas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subtabIntro = subtabs.find((s: any) => s.nome === 'introducao');
    const subtabDev = subtabs.find((s: any) => s.nome === 'desenvolvimento');
    const subtabConc = subtabs.find((s: any) => s.nome === 'conclusao');

    if (!subtabIntro || !subtabDev || !subtabConc) {
      return new Response(
        JSON.stringify({ error: 'Subtabs necessárias não encontradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Buscar calibrações ─────────────────────────────────────────
    console.log('📐 Buscando calibrações...');
    const [calibIntroData, calibDevData, calibConcData] = await Promise.all([
      supabaseClient.rpc('get_calibracao_by_subtab', { p_subtab_id: subtabIntro.id }),
      supabaseClient.rpc('get_calibracao_by_subtab', { p_subtab_id: subtabDev.id }),
      supabaseClient.rpc('get_calibracao_by_subtab', { p_subtab_id: subtabConc.id }),
    ]);

    const defaults: Record<string, any> = {
      introducao: { periodos_exatos: 3, palavras_min: 80, palavras_max: 120, validacao_automatica: true, max_tentativas_geracao: 2, regras_composicao: {} },
      desenvolvimento: { periodos_exatos: 5, palavras_min: 100, palavras_max: 150, validacao_automatica: false, max_tentativas_geracao: 2, regras_composicao: {} },
      conclusao: { periodos_exatos: 3, palavras_min: 80, palavras_max: 120, validacao_automatica: false, max_tentativas_geracao: 2, regras_composicao: {} },
    };

    const calibIntro = (calibIntroData.data?.length > 0) ? calibIntroData.data[0] : defaults.introducao;
    const calibDev = (calibDevData.data?.length > 0) ? calibDevData.data[0] : defaults.desenvolvimento;
    const calibConc = (calibConcData.data?.length > 0) ? calibConcData.data[0] : defaults.conclusao;

    // ── Buscar modelos de referência ───────────────────────────────
    console.log('📚 Buscando modelos de referência...');
    const [modelosIntroData, modelosDevData, modelosConcData] = await Promise.all([
      supabaseClient.rpc('get_modelos_referencia', { p_subtab_id: subtabIntro.id, p_apenas_ativos: true, p_limit: 2 }),
      supabaseClient.rpc('get_modelos_referencia', { p_subtab_id: subtabDev.id, p_apenas_ativos: true, p_limit: 2 }),
      supabaseClient.rpc('get_modelos_referencia', { p_subtab_id: subtabConc.id, p_apenas_ativos: true, p_limit: 2 }),
    ]);

    const modelosIntro = modelosIntroData.data || [];
    const modelosDev = modelosDevData.data || [];
    const modelosConc = modelosConcData.data || [];

    console.log(`📚 Modelos: intro=${modelosIntro.length}, dev=${modelosDev.length}, conc=${modelosConc.length}`);

    // ── Buscar modo ────────────────────────────────────────────────
    const { data: modo } = await supabaseClient
      .from('jarvis_modos')
      .select('id, nome')
      .eq('id', modoId)
      .single();

    // ── Gerar redação completa ─────────────────────────────────────
    const prompt = construirPromptCompleto(
      calibIntro, calibDev, calibConc,
      modelosIntro, modelosDev, modelosConc,
      tema
    );

    console.log('🤖 Chamando OpenAI para redação completa...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openaiData = await openaiResponse.json();
    const tokens_input = openaiData.usage?.prompt_tokens || 0;
    const tokens_output = openaiData.usage?.completion_tokens || 0;
    const tokens_total = openaiData.usage?.total_tokens || 0;

    const resultado = JSON.parse(openaiData.choices[0].message.content);

    const introducao = resultado.introducao || '';
    const desenvolvimento1 = resultado.desenvolvimento_1 || '';
    const desenvolvimento2 = resultado.desenvolvimento_2 || '';
    const conclusao = resultado.conclusao || '';

    if (!introducao || !desenvolvimento1 || !desenvolvimento2 || !conclusao) {
      return new Response(
        JSON.stringify({
          error: 'Resposta incompleta da IA — partes faltando',
          partes_recebidas: Object.keys(resultado)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Texto final concatenado
    const textoGerado = [introducao, desenvolvimento1, desenvolvimento2, conclusao]
      .join('\n\n');

    const palavrasGeradas = contarPalavras(textoGerado);
    console.log(`✅ Redação completa gerada! (${palavrasGeradas} palavras)`);

    // ── Consumir créditos ──────────────────────────────────────────
    let creditosRestantes = user.jarvis_creditos;
    for (let i = 0; i < creditosNecessarios; i++) {
      const { data: newCredits, error: creditError } = await supabaseClient
        .rpc('consume_jarvis_credit', { target_user_id: user.id });
      if (creditError) throw new Error('Erro ao consumir créditos');
      creditosRestantes = newCredits;
    }

    // ── Salvar interação ───────────────────────────────────────────
    await supabaseClient.from('jarvis_interactions').insert({
      user_id: user.id,
      modo_id: modo?.id,
      subtab_nome: 'redacao_completa',
      etapa: 'geracao',
      sessao_id: null,
      texto_original: JSON.stringify({ tema }),
      resposta_json: {
        introducao,
        desenvolvimento_1: desenvolvimento1,
        desenvolvimento_2: desenvolvimento2,
        conclusao,
        redacao_completa: textoGerado,
      },
      versao_melhorada: textoGerado,
      palavras_original: 0,
      palavras_melhorada: palavrasGeradas,
      model_used: 'gpt-4o',
      tempo_resposta_ms: 0,
      tokens_input,
      tokens_output,
      tokens_total,
      creditos_consumidos: creditosNecessarios
    });

    // ── Resposta ───────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        texto_gerado: textoGerado,
        partes: { introducao, desenvolvimento_1: desenvolvimento1, desenvolvimento_2: desenvolvimento2, conclusao },
        palavras_geradas: palavrasGeradas,
        jarvis_creditos_restantes: creditosRestantes,
        creditos_consumidos: creditosNecessarios,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro na função jarvis-redacao-completa:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
