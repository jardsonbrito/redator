import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GerarRequest {
  userEmail: string;
  sessaoId: string;
  dadosCompletos: Record<string, string>;
  creditosNecessarios: number;
}

interface ValidationResult {
  valido: boolean;
  erros: string[];
  avisos: string[];
  metricas: {
    periodos: number;
    palavras: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÃO DE VALIDAÇÃO PEDAGÓGICA
// ═══════════════════════════════════════════════════════════════
function validarIntroducao(
  texto: string,
  calibracao: any,
  dadosCompletos: Record<string, string>
): ValidationResult {
  const erros: string[] = [];
  const avisos: string[] = [];

  // 1. Contar períodos (split por . ! ?)
  const periodos = texto.split(/[.!?]/).filter(p => p.trim().length > 10).length;
  if (calibracao.periodos_exatos && periodos !== calibracao.periodos_exatos) {
    erros.push(`❌ Esperados ${calibracao.periodos_exatos} períodos, encontrados ${periodos}`);
  }

  // 2. Contar palavras
  const palavras = texto.split(/\s+/).filter(p => p.trim()).length;
  if (calibracao.palavras_min && palavras < calibracao.palavras_min) {
    erros.push(`❌ Muito curto: ${palavras} palavras (mínimo: ${calibracao.palavras_min})`);
  }
  if (calibracao.palavras_max && palavras > calibracao.palavras_max) {
    erros.push(`❌ Muito longo: ${palavras} palavras (máximo: ${calibracao.palavras_max})`);
  }

  // 3. Verificar se menciona os 2 aspectos causais
  if (dadosCompletos.aspecto_1 && dadosCompletos.aspecto_2) {
    const aspecto1Mencionado = texto.toLowerCase().includes(
      dadosCompletos.aspecto_1.toLowerCase().substring(0, Math.min(20, dadosCompletos.aspecto_1.length))
    );
    const aspecto2Mencionado = texto.toLowerCase().includes(
      dadosCompletos.aspecto_2.toLowerCase().substring(0, Math.min(20, dadosCompletos.aspecto_2.length))
    );

    if (!aspecto1Mencionado || !aspecto2Mencionado) {
      avisos.push('⚠️ Tese pode não mencionar claramente os 2 aspectos causais');
    }
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos,
    metricas: { periodos, palavras }
  };
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUIR PROMPT COM CALIBRAÇÃO PEDAGÓGICA
// ═══════════════════════════════════════════════════════════════
function construirPromptCalibrado(
  promptBase: string,
  calibracao: any,
  modelos: any[],
  dadosCompletos: Record<string, string>
): string {
  let prompt = `Você é Jarvis, assistente de redação ENEM do Laboratório do Redator.

Gere uma introdução de redação ENEM seguindo RIGOROSAMENTE estes parâmetros:

═══════════════════════════════════════════════════════════
PARÂMETROS ESTRUTURAIS OBRIGATÓRIOS:
═══════════════════════════════════════════════════════════

• Número EXATO de períodos: ${calibracao.periodos_exatos}
• Extensão: entre ${calibracao.palavras_min} e ${calibracao.palavras_max} palavras
• Estrutura OBRIGATÓRIA:
  1º período: Repertório sociocultural + interpretação integrada
  2º período: Contextualização problematizada no Brasil
  3º período: Tese por causalidade mencionando explicitamente os 2 aspectos

═══════════════════════════════════════════════════════════
REGRAS DE COMPOSIÇÃO:
═══════════════════════════════════════════════════════════

`;

  if (calibracao.regras_composicao) {
    const regras = calibracao.regras_composicao;
    if (regras.nivel_concisao) {
      prompt += `• Concisão: ${regras.nivel_concisao}\n`;
    }
    if (regras.tom) {
      prompt += `• Tom: ${regras.tom}\n`;
    }
    if (regras.coesivos_sugeridos && Array.isArray(regras.coesivos_sugeridos)) {
      prompt += `• Coesivos sugeridos: ${regras.coesivos_sugeridos.join(', ')}\n`;
    }
    if (regras.restricoes && Array.isArray(regras.restricoes)) {
      prompt += `• Restrições:\n`;
      regras.restricoes.forEach((r: string) => {
        prompt += `  - ${r}\n`;
      });
    }
  }

  if (calibracao.instrucoes_geracao) {
    prompt += `\n═══════════════════════════════════════════════════════════
INSTRUÇÕES ADICIONAIS:
═══════════════════════════════════════════════════════════

${calibracao.instrucoes_geracao}
`;
  }

  // Adicionar modelos de referência (few-shot learning)
  if (modelos && modelos.length > 0) {
    prompt += `\n═══════════════════════════════════════════════════════════
MODELOS DE REFERÊNCIA (siga este padrão):
═══════════════════════════════════════════════════════════

`;
    modelos.forEach((modelo, i) => {
      prompt += `EXEMPLO ${i + 1} (${modelo.palavras} palavras, ${modelo.periodos} períodos)
Tema: "${modelo.tema}"

${modelo.texto_modelo}

${modelo.observacoes ? `Observação: ${modelo.observacoes}\n` : ''}
─────────────────────────────────────────────────────────

`;
    });

    prompt += `IMPORTANTE: Use esses exemplos como GUIA de:
- Concisão e densidade
- Sintaxe e organização dos períodos
- Nível de formalidade
- Integração dos elementos estruturais

NÃO copie o conteúdo. REPRODUZA o padrão estrutural e estilístico.

`;
  }

  // Adicionar elementos fornecidos pelo aluno
  prompt += `═══════════════════════════════════════════════════════════
ELEMENTOS FORNECIDOS PELO ALUNO:
═══════════════════════════════════════════════════════════

`;
  Object.entries(dadosCompletos).forEach(([campo, valor]) => {
    const labels: Record<string, string> = {
      tema: 'Tema',
      repertorio: 'Repertório',
      interpretacao: 'Interpretação',
      contextualizacao: 'Contextualização no Brasil',
      aspecto_1: 'Aspecto Causal 1',
      aspecto_2: 'Aspecto Causal 2'
    };
    prompt += `${labels[campo] || campo}: ${valor}\n`;
  });

  // Adicionar validação interna
  prompt += `\n═══════════════════════════════════════════════════════════
VALIDAÇÃO INTERNA (faça antes de retornar):
═══════════════════════════════════════════════════════════

Antes de finalizar, CONTE:
1. Quantos períodos você gerou? Deve ser EXATAMENTE ${calibracao.periodos_exatos}
2. Quantas palavras tem o texto? Deve estar entre ${calibracao.palavras_min} e ${calibracao.palavras_max}
3. Você mencionou claramente "${dadosCompletos.aspecto_1}" E "${dadosCompletos.aspecto_2}" na tese?

Se qualquer resposta for NÃO, REFAÇA antes de retornar.

═══════════════════════════════════════════════════════════

Retorne JSON:
{
  "introducao": "Texto completo da introdução (${calibracao.periodos_exatos} períodos)"
}`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🎓 Jarvis Tutoria - Geração (com Calibração Pedagógica) - Iniciando');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { userEmail, sessaoId, dadosCompletos, creditosNecessarios }: GerarRequest = await req.json();

    if (!userEmail || !sessaoId || !dadosCompletos || !creditosNecessarios) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios faltando' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Email:', userEmail);
    console.log('🆔 Sessão:', sessaoId);
    console.log('💳 Créditos necessários:', creditosNecessarios);

    // ── Buscar usuário ─────────────────────────────────────────────
    const { data: user, error: userError } = await supabaseClient
      .from('profiles')
      .select('id, jarvis_creditos, nome')
      .eq('email', userEmail.toLowerCase().trim())
      .eq('user_type', 'aluno')
      .single();

    if (userError || !user) {
      console.error('❌ Usuário não encontrado:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('👤 Usuário:', user.nome, '| Créditos:', user.jarvis_creditos);

    // ── Verificar créditos ─────────────────────────────────────────
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

    // ── Buscar sessão ──────────────────────────────────────────────
    const { data: sessao, error: sessaoError } = await supabaseClient
      .from('jarvis_tutoria_sessoes')
      .select('id, modo_id, subtab_nome, user_id')
      .eq('id', sessaoId)
      .eq('user_id', user.id)
      .single();

    if (sessaoError || !sessao) {
      console.error('❌ Sessão não encontrada:', sessaoError);
      return new Response(
        JSON.stringify({ error: 'Sessão não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Buscar subtab ──────────────────────────────────────────────
    const { data: subtab, error: subtabError } = await supabaseClient
      .from('jarvis_tutoria_subtabs')
      .select('id, nome')
      .eq('nome', sessao.subtab_nome)
      .eq('modo_id', sessao.modo_id)
      .single();

    if (subtabError || !subtab) {
      console.error('❌ Subtab não encontrada:', subtabError);
      return new Response(
        JSON.stringify({ error: 'Subtab não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Buscar calibração pedagógica ───────────────────────────────
    console.log('📐 Buscando calibração pedagógica...');
    const { data: calibracaoData } = await supabaseClient
      .rpc('get_calibracao_by_subtab', { p_subtab_id: subtab.id });

    const calibracao = calibracaoData && calibracaoData.length > 0
      ? calibracaoData[0]
      : {
          periodos_exatos: 3,
          palavras_min: 80,
          palavras_max: 120,
          validacao_automatica: true,
          max_tentativas_geracao: 3,
          instrucoes_geracao: 'Use sintaxe concisa.',
          regras_composicao: {}
        };

    console.log('📐 Calibração:', {
      periodos: calibracao.periodos_exatos,
      palavras: `${calibracao.palavras_min}-${calibracao.palavras_max}`,
      validacao: calibracao.validacao_automatica
    });

    // ── Buscar modelos de referência (top 3) ───────────────────────
    console.log('📚 Buscando modelos de referência...');
    const { data: modelos } = await supabaseClient
      .rpc('get_modelos_referencia', {
        p_subtab_id: subtab.id,
        p_apenas_ativos: true,
        p_limit: 3
      });

    console.log(`📚 ${modelos?.length || 0} modelo(s) encontrado(s)`);

    // ── Buscar configuração do modo ────────────────────────────────
    const { data: modo } = await supabaseClient
      .from('jarvis_modos')
      .select('id, nome, config_interativa')
      .eq('id', sessao.modo_id)
      .single();

    const promptBase = modo?.config_interativa?.prompts?.geracao || '';

    // ── LOOP DE GERAÇÃO COM VALIDAÇÃO ──────────────────────────────
    let textoGerado: string | null = null;
    let tentativas = 0;
    const maxTentativas = calibracao.max_tentativas_geracao || 3;
    let ultimaValidacao: ValidationResult | null = null;
    let tokens_input = 0;
    let tokens_output = 0;
    let tokens_total = 0;

    console.log(`🔄 Iniciando loop de geração (max ${maxTentativas} tentativas)...`);

    while (!textoGerado && tentativas < maxTentativas) {
      tentativas++;
      console.log(`\n🔄 Tentativa ${tentativas}/${maxTentativas}`);

      const startTime = Date.now();

      // Construir prompt calibrado
      const promptCalibrado = construirPromptCalibrado(
        promptBase,
        calibracao,
        modelos || [],
        dadosCompletos
      );

      // Chamar OpenAI
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: promptCalibrado }
          ],
          temperature: 0.7,
          max_tokens: 1024,
          response_format: { type: "json_object" }
        })
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        console.error('❌ Erro OpenAI:', errorData);
        throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const openaiData = await openaiResponse.json();
      const responseTime = Date.now() - startTime;

      // Acumular tokens
      tokens_input += openaiData.usage?.prompt_tokens || 0;
      tokens_output += openaiData.usage?.completion_tokens || 0;
      tokens_total += openaiData.usage?.total_tokens || 0;

      const content = openaiData.choices[0].message.content;
      const resultado = JSON.parse(content);
      const textoTentativa = resultado.introducao || resultado.texto || '';

      console.log(`📝 Texto gerado em ${responseTime}ms (${textoTentativa.split(/\s+/).length} palavras)`);

      // Validar se calibração automática está ativa
      if (calibracao.validacao_automatica) {
        const validacao = validarIntroducao(textoTentativa, calibracao, dadosCompletos);
        ultimaValidacao = validacao;

        console.log(`🔍 Validação:`, {
          valido: validacao.valido,
          periodos: validacao.metricas.periodos,
          palavras: validacao.metricas.palavras,
          erros: validacao.erros.length,
          avisos: validacao.avisos.length
        });

        if (validacao.valido) {
          console.log(`✅ Validação passou na tentativa ${tentativas}`);
          textoGerado = textoTentativa;

          if (validacao.avisos.length > 0) {
            console.log(`⚠️ Avisos:`, validacao.avisos);
          }
        } else {
          console.log(`❌ Validação falhou:`, validacao.erros);
          if (tentativas < maxTentativas) {
            console.log(`🔄 Tentando novamente...`);
          }
        }
      } else {
        // Sem validação automática: aceitar primeiro resultado
        console.log(`✅ Validação automática desativada - aceitando resultado`);
        textoGerado = textoTentativa;
      }
    }

    if (!textoGerado) {
      console.error(`❌ Não foi possível gerar introdução dentro dos parâmetros após ${maxTentativas} tentativas`);
      return new Response(
        JSON.stringify({
          error: 'Não foi possível gerar introdução dentro dos parâmetros pedagógicos',
          detalhes: ultimaValidacao?.erros || [],
          tentativas_realizadas: tentativas
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const palavrasGeradas = textoGerado.split(/\s+/).length;

    console.log(`\n✅ Introdução gerada com sucesso após ${tentativas} tentativa(s)!`);
    console.log(`📊 Métricas finais:`, {
      palavras: palavrasGeradas,
      periodos: ultimaValidacao?.metricas.periodos,
      tentativas,
      tokens_total
    });

    // ── Consumir créditos ──────────────────────────────────────────
    console.log(`💳 Consumindo ${creditosNecessarios} crédito(s) Jarvis...`);

    let creditosRestantes = user.jarvis_creditos;
    for (let i = 0; i < creditosNecessarios; i++) {
      const { data: newCredits, error: creditError } = await supabaseClient
        .rpc('consume_jarvis_credit', { target_user_id: user.id });

      if (creditError) {
        console.error('❌ Erro ao consumir crédito:', creditError);
        throw new Error('Erro ao consumir créditos');
      }
      creditosRestantes = newCredits;
    }

    console.log(`✅ Créditos consumidos. Novos créditos: ${creditosRestantes}`);

    // ── Salvar interação ───────────────────────────────────────────
    const { error: saveError } = await supabaseClient
      .from('jarvis_interactions')
      .insert({
        user_id: user.id,
        modo_id: modo.id,
        subtab_nome: sessao.subtab_nome,
        etapa: 'geracao',
        sessao_id: sessao.id,
        texto_original: JSON.stringify(dadosCompletos),
        resposta_json: {
          introducao: textoGerado,
          calibracao_aplicada: {
            periodos_exatos: calibracao.periodos_exatos,
            palavras_range: [calibracao.palavras_min, calibracao.palavras_max],
            tentativas,
            validacao: ultimaValidacao
          }
        },
        versao_melhorada: textoGerado,
        palavras_original: 0,
        palavras_melhorada: palavrasGeradas,
        model_used: 'gpt-4o',
        tempo_resposta_ms: 0,  // tempo total seria soma de todas tentativas
        tokens_input,
        tokens_output,
        tokens_total,
        creditos_consumidos: creditosNecessarios
      });

    if (saveError) {
      console.error('⚠️ Erro ao salvar interação:', saveError);
    }

    // ── Atualizar sessão ───────────────────────────────────────────
    const { error: updateError } = await supabaseClient
      .from('jarvis_tutoria_sessoes')
      .update({
        texto_gerado: textoGerado,
        etapa_atual: 'gerado',
        finalizado: true,
        creditos_consumidos: creditosNecessarios,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', sessao.id);

    if (updateError) {
      console.error('⚠️ Erro ao atualizar sessão:', updateError);
    }

    // ── Resposta ───────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        texto_gerado: textoGerado,
        palavras_geradas: palavrasGeradas,
        jarvis_creditos_restantes: creditosRestantes,
        creditos_consumidos: creditosNecessarios,
        metricas_calibracao: {
          tentativas_realizadas: tentativas,
          validacao_passou: ultimaValidacao?.valido || false,
          periodos_gerados: ultimaValidacao?.metricas.periodos,
          palavras_geradas: ultimaValidacao?.metricas.palavras
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro na função jarvis-tutoria-gerar:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
