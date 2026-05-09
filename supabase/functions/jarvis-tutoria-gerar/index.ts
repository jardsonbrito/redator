import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GerarRequest {
  userEmail: string;
  // Novo fluxo: passa modoId + subtabNome diretamente
  modoId?: string;
  subtabNome?: string;
  // Fluxo legado: passa sessaoId (ainda suportado)
  sessaoId?: string;
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
// UTILITÁRIOS DE MÉTRICAS
// ═══════════════════════════════════════════════════════════════
function contarPeriodos(texto: string): number {
  return texto.split(/[.!?]/).filter(p => p.trim().length > 10).length;
}

function contarPalavras(texto: string): number {
  return texto.split(/\s+/).filter(p => p.trim()).length;
}

// ═══════════════════════════════════════════════════════════════
// VALIDAÇÃO POR TIPO DE PARÁGRAFO
// ═══════════════════════════════════════════════════════════════

function validarIntroducao(
  texto: string,
  calibracao: any,
  dadosCompletos: Record<string, string>
): ValidationResult {
  const erros: string[] = [];
  const avisos: string[] = [];
  const periodos = contarPeriodos(texto);
  const palavras = contarPalavras(texto);

  if (calibracao.periodos_exatos && periodos !== calibracao.periodos_exatos) {
    erros.push(`❌ Esperados ${calibracao.periodos_exatos} períodos, encontrados ${periodos}`);
  }
  if (calibracao.palavras_min && palavras < calibracao.palavras_min) {
    erros.push(`❌ Muito curto: ${palavras} palavras (mínimo: ${calibracao.palavras_min})`);
  }
  if (calibracao.palavras_max && palavras > calibracao.palavras_max) {
    erros.push(`❌ Muito longo: ${palavras} palavras (máximo: ${calibracao.palavras_max})`);
  }
  if (dadosCompletos.aspecto_1 && dadosCompletos.aspecto_2) {
    const a1 = texto.toLowerCase().includes(dadosCompletos.aspecto_1.toLowerCase().substring(0, 20));
    const a2 = texto.toLowerCase().includes(dadosCompletos.aspecto_2.toLowerCase().substring(0, 20));
    if (!a1 || !a2) {
      avisos.push('⚠️ Tese pode não mencionar claramente os 2 aspectos causais');
    }
  }
  return { valido: erros.length === 0, erros, avisos, metricas: { periodos, palavras } };
}

function validarDesenvolvimento(
  texto: string,
  calibracao: any,
  dadosCompletos: Record<string, string>
): ValidationResult {
  const erros: string[] = [];
  const avisos: string[] = [];
  const periodos = contarPeriodos(texto);
  const palavras = contarPalavras(texto);

  if (calibracao.periodos_exatos && periodos !== calibracao.periodos_exatos) {
    erros.push(`❌ Esperados ${calibracao.periodos_exatos} períodos, encontrados ${periodos}`);
  }
  if (calibracao.palavras_min && palavras < calibracao.palavras_min) {
    erros.push(`❌ Muito curto: ${palavras} palavras (mínimo: ${calibracao.palavras_min})`);
  }
  if (calibracao.palavras_max && palavras > calibracao.palavras_max) {
    erros.push(`❌ Muito longo: ${palavras} palavras (máximo: ${calibracao.palavras_max})`);
  }

  const criterios = calibracao.criterios_celula_argumentativa;
  if (criterios) {
    if (criterios.validar_topico_frasal && dadosCompletos.topico_frasal) {
      const presente = texto.toLowerCase().includes(
        dadosCompletos.topico_frasal.toLowerCase().substring(0, 20)
      );
      if (!presente) avisos.push('⚠️ Tópico frasal pode não estar claramente presente');
    }
  }
  return { valido: erros.length === 0, erros, avisos, metricas: { periodos, palavras } };
}

function validarConclusao(
  texto: string,
  calibracao: any,
  dadosCompletos: Record<string, string>
): ValidationResult {
  const erros: string[] = [];
  const avisos: string[] = [];
  const periodos = contarPeriodos(texto);
  const palavras = contarPalavras(texto);

  if (calibracao.periodos_exatos && periodos !== calibracao.periodos_exatos) {
    erros.push(`❌ Esperados ${calibracao.periodos_exatos} períodos, encontrados ${periodos}`);
  }
  if (calibracao.palavras_min && palavras < calibracao.palavras_min) {
    erros.push(`❌ Muito curto: ${palavras} palavras (mínimo: ${calibracao.palavras_min})`);
  }
  if (calibracao.palavras_max && palavras > calibracao.palavras_max) {
    erros.push(`❌ Muito longo: ${palavras} palavras (máximo: ${calibracao.palavras_max})`);
  }

  const criterios = calibracao.criterios_proposta_intervencao;
  if (criterios?.verificar_c5) {
    const obrigatorios: string[] = criterios.elementos_obrigatorios || ['agente', 'acao', 'finalidade'];
    const mapeamento: Record<string, string> = {
      agente: dadosCompletos.agente || '',
      acao: dadosCompletos.acao || '',
      finalidade: dadosCompletos.finalidade || '',
    };
    for (const el of obrigatorios) {
      if (mapeamento[el] && !texto.toLowerCase().includes(mapeamento[el].toLowerCase().substring(0, 15))) {
        avisos.push(`⚠️ Elemento C5 "${el}" pode não estar presente na proposta`);
      }
    }
  }
  return { valido: erros.length === 0, erros, avisos, metricas: { periodos, palavras } };
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUÇÃO DO PROMPT POR TIPO DE PARÁGRAFO
// ═══════════════════════════════════════════════════════════════

function secaoRegras(calibracao: any): string {
  let s = '';
  const regras = calibracao.regras_composicao;
  if (!regras) return s;
  if (regras.nivel_concisao) s += `• Concisão: ${regras.nivel_concisao}\n`;
  if (regras.tom) s += `• Tom: ${regras.tom}\n`;
  if (regras.coesivos_sugeridos?.length) s += `• Coesivos sugeridos: ${regras.coesivos_sugeridos.join(', ')}\n`;
  if (regras.restricoes?.length) {
    s += `• Restrições:\n`;
    regras.restricoes.forEach((r: string) => { s += `  - ${r}\n`; });
  }
  return s;
}

function secaoModelos(modelos: any[]): string {
  if (!modelos || modelos.length === 0) return '';
  let s = `\n═══════════════════════════════════════════════════════════
MODELOS DE REFERÊNCIA (siga este padrão):
═══════════════════════════════════════════════════════════

`;
  modelos.forEach((m, i) => {
    s += `EXEMPLO ${i + 1} (${m.palavras} palavras, ${m.periodos} períodos)
Tema: "${m.tema}"

${m.texto_modelo}

${m.observacoes ? `Observação: ${m.observacoes}\n` : ''}─────────────────────────────────────────────────────────

`;
  });
  s += `IMPORTANTE: Use esses exemplos como GUIA de concisão, sintaxe e nível de formalidade.
NÃO copie o conteúdo — REPRODUZA o padrão estrutural e estilístico.

`;
  return s;
}

function construirPromptIntroducao(
  calibracao: any,
  modelos: any[],
  dadosCompletos: Record<string, string>
): string {
  const labels: Record<string, string> = {
    tema: 'Tema',
    repertorio: 'Repertório sociocultural',
    interpretacao: 'Interpretação do repertório',
    contextualizacao: 'Contextualização no Brasil',
    aspecto_1: 'Aspecto Causal 1 (tese)',
    aspecto_2: 'Aspecto Causal 2 (tese)',
  };

  const defaultPeriodos = [
    '1º período: Repertório sociocultural + interpretação integrada ao tema',
    '2º período: Contextualização problematizada no Brasil',
    '3º período: Tese por causalidade mencionando EXPLICITAMENTE os 2 aspectos',
  ];
  const estruturaPeriodos: string[] =
    calibracao.regras_composicao?.estrutura_periodos ?? defaultPeriodos;

  let prompt = `Você é Jarvis, assistente de redação ENEM do Laboratório do Redator.

Gere uma INTRODUÇÃO de redação ENEM seguindo RIGOROSAMENTE estes parâmetros:

═══════════════════════════════════════════════════════════
PARÂMETROS ESTRUTURAIS OBRIGATÓRIOS:
═══════════════════════════════════════════════════════════

• Número EXATO de períodos: ${calibracao.periodos_exatos}
• Extensão: entre ${calibracao.palavras_min} e ${calibracao.palavras_max} palavras
• Estrutura OBRIGATÓRIA:
${estruturaPeriodos.map(p => `  ${p}`).join('\n')}

═══════════════════════════════════════════════════════════
REGRAS DE COMPOSIÇÃO:
═══════════════════════════════════════════════════════════

${secaoRegras(calibracao)}`;

  if (calibracao.instrucoes_geracao) {
    prompt += `\n═══════════════════════════════════════════════════════════
INSTRUÇÕES ADICIONAIS:
═══════════════════════════════════════════════════════════

${calibracao.instrucoes_geracao}
`;
  }

  prompt += secaoModelos(modelos);

  prompt += `═══════════════════════════════════════════════════════════
ELEMENTOS FORNECIDOS PELO ALUNO:
═══════════════════════════════════════════════════════════

`;
  Object.entries(dadosCompletos).forEach(([campo, valor]) => {
    if (valor) prompt += `${labels[campo] || campo}: ${valor}\n`;
  });

  prompt += `\n═══════════════════════════════════════════════════════════
VALIDAÇÃO INTERNA (faça antes de retornar):
═══════════════════════════════════════════════════════════

Antes de finalizar, VERIFIQUE:
1. O texto tem EXATAMENTE ${calibracao.periodos_exatos} períodos?
2. O texto tem entre ${calibracao.palavras_min} e ${calibracao.palavras_max} palavras?
3. A tese menciona claramente "${dadosCompletos.aspecto_1 || 'aspecto 1'}" E "${dadosCompletos.aspecto_2 || 'aspecto 2'}"?

Se qualquer resposta for NÃO, REFAÇA antes de retornar.

═══════════════════════════════════════════════════════════

Retorne JSON:
{
  "introducao": "Texto completo da introdução (${calibracao.periodos_exatos} períodos)"
}`;

  return prompt;
}

function construirPromptDesenvolvimento(
  calibracao: any,
  modelos: any[],
  dadosCompletos: Record<string, string>
): string {
  const criterios = calibracao.criterios_celula_argumentativa;
  const labels: Record<string, string> = {
    tema: 'Tema da redação',
    topico_frasal: 'Tópico frasal (argumento central)',
    argumento: 'Argumento principal',
    explicacao: 'Explicação do argumento',
    embasamento: 'Embasamento (dado/citação/exemplo)',
    aplicacao_tema: 'Aplicação ao tema',
    causalidade: 'Relação causal a explorar',
    aprofundamento: 'Aprofundamento crítico',
  };

  let prompt = `Você é Jarvis, assistente de redação ENEM do Laboratório do Redator.

Gere um PARÁGRAFO DE DESENVOLVIMENTO de redação ENEM seguindo RIGOROSAMENTE estes parâmetros:

═══════════════════════════════════════════════════════════
PARÂMETROS ESTRUTURAIS OBRIGATÓRIOS:
═══════════════════════════════════════════════════════════

• Número EXATO de períodos: ${calibracao.periodos_exatos}
• Extensão: entre ${calibracao.palavras_min} e ${calibracao.palavras_max} palavras
• Estrutura OBRIGATÓRIA da célula argumentativa:`;

  const chaveParaDesc: Record<string, string> = {
    validar_topico_frasal: 'topico_frasal',
    validar_explicacao: 'explicacao',
    validar_embasamento: 'embasamento',
    validar_aplicacao_tema: 'aplicacao_tema',
    validar_causalidade: 'causalidade',
    validar_aprofundamento: 'aprofundamento',
  };
  const descricoesPadrao: Record<string, string> = {
    topico_frasal: 'Tópico frasal: sentença de abertura que apresenta o argumento central',
    explicacao: 'Explicação: desenvolvimento e elucidação do argumento',
    embasamento: 'Embasamento: dado, citação ou exemplo que sustenta o argumento',
    aplicacao_tema: 'Aplicação ao tema: conexão explícita do argumento com o tema proposto',
    causalidade: 'Causalidade: relação causa-efeito entre os elementos apresentados',
    aprofundamento: 'Aprofundamento: análise crítica ou reflexão aprofundada sobre o argumento',
  };

  if (criterios) {
    prompt += '\n';
    Object.entries(chaveParaDesc).forEach(([chaveValidar, chaveDesc]) => {
      if (criterios[chaveValidar]) {
        const desc = criterios.descricoes?.[chaveDesc] ?? descricoesPadrao[chaveDesc];
        prompt += `  • ${desc}\n`;
      }
    });
  } else {
    prompt += `
  • Tópico frasal: sentença de abertura com o argumento central
  • Explicação do argumento
  • Embasamento com dado ou citação
  • Aplicação ao tema da redação
  • Relação de causalidade
`;
  }

  prompt += `
═══════════════════════════════════════════════════════════
REGRAS DE COMPOSIÇÃO:
═══════════════════════════════════════════════════════════

${secaoRegras(calibracao)}`;

  if (calibracao.instrucoes_geracao) {
    prompt += `\n═══════════════════════════════════════════════════════════
INSTRUÇÕES ADICIONAIS:
═══════════════════════════════════════════════════════════

${calibracao.instrucoes_geracao}
`;
  }

  prompt += secaoModelos(modelos);

  prompt += `═══════════════════════════════════════════════════════════
ELEMENTOS FORNECIDOS PELO ALUNO:
═══════════════════════════════════════════════════════════

`;
  Object.entries(dadosCompletos).forEach(([campo, valor]) => {
    if (valor) prompt += `${labels[campo] || campo}: ${valor}\n`;
  });

  prompt += `\n═══════════════════════════════════════════════════════════
VALIDAÇÃO INTERNA (faça antes de retornar):
═══════════════════════════════════════════════════════════

Antes de finalizar, VERIFIQUE:
1. O parágrafo tem EXATAMENTE ${calibracao.periodos_exatos} períodos?
2. O texto tem entre ${calibracao.palavras_min} e ${calibracao.palavras_max} palavras?
3. Todos os elementos da célula argumentativa estão presentes?
4. O tópico frasal abre o parágrafo com clareza?

Se qualquer resposta for NÃO, REFAÇA antes de retornar.

═══════════════════════════════════════════════════════════

Retorne JSON:
{
  "desenvolvimento": "Texto completo do parágrafo de desenvolvimento (${calibracao.periodos_exatos} períodos)"
}`;

  return prompt;
}

function construirPromptConclusao(
  calibracao: any,
  modelos: any[],
  dadosCompletos: Record<string, string>
): string {
  const criterios = calibracao.criterios_proposta_intervencao;
  const labels: Record<string, string> = {
    tema: 'Tema da redação',
    tese: 'Tese (para retomada sintética)',
    agente: 'Agente responsável',
    acao: 'Ação proposta',
    meio_modo: 'Meio/Modo de execução',
    finalidade: 'Finalidade da proposta',
    detalhamento: 'Detalhamento adicional',
  };

  const descricoesPadraoC5: Record<string, string> = {
    agente: 'Agente: entidade responsável pela proposta (governo, escola, família, sociedade, etc.)',
    acao: 'Ação: o que deve ser feito — use verbo de ação claro e específico',
    meio_modo: 'Meio/Modo: como a ação será executada — instrumentos, estratégias, métodos',
    finalidade: 'Finalidade: para que a ação será executada — objetivo final ou impacto esperado',
    detalhamento: 'Detalhamento: especificação que torna a proposta mais concreta e viável',
  };

  let prompt = `Você é Jarvis, assistente de redação ENEM do Laboratório do Redator.

Gere uma CONCLUSÃO de redação ENEM seguindo RIGOROSAMENTE estes parâmetros:

═══════════════════════════════════════════════════════════
PARÂMETROS ESTRUTURAIS OBRIGATÓRIOS:
═══════════════════════════════════════════════════════════

• Número EXATO de períodos: ${calibracao.periodos_exatos}
• Extensão: entre ${calibracao.palavras_min} e ${calibracao.palavras_max} palavras
• Estrutura OBRIGATÓRIA:`;

  if (criterios?.verificar_retomada_tese) {
    prompt += `\n  • 1º período: Retomada sintética da tese (sem repetir literalmente)`;
  }

  prompt += `\n  • Proposta de intervenção com os elementos C5 obrigatórios:\n`;

  const elementosObrigatorios: string[] = criterios?.elementos_obrigatorios || ['agente', 'acao', 'finalidade'];
  const todosElementos: string[] = criterios?.elementos_c5 || ['agente', 'acao', 'meio_modo', 'finalidade', 'detalhamento'];

  todosElementos.forEach((el: string) => {
    const obrigatorio = elementosObrigatorios.includes(el);
    const desc = criterios?.descricoes?.[el] ?? descricoesPadraoC5[el] ?? el;
    prompt += `    ${obrigatorio ? '✓ OBRIGATÓRIO' : '○ recomendado'} — ${desc}\n`;
  });

  prompt += `
═══════════════════════════════════════════════════════════
REGRAS DE COMPOSIÇÃO:
═══════════════════════════════════════════════════════════

${secaoRegras(calibracao)}`;

  if (calibracao.instrucoes_geracao) {
    prompt += `\n═══════════════════════════════════════════════════════════
INSTRUÇÕES ADICIONAIS:
═══════════════════════════════════════════════════════════

${calibracao.instrucoes_geracao}
`;
  }

  prompt += secaoModelos(modelos);

  prompt += `═══════════════════════════════════════════════════════════
ELEMENTOS FORNECIDOS PELO ALUNO:
═══════════════════════════════════════════════════════════

`;
  Object.entries(dadosCompletos).forEach(([campo, valor]) => {
    if (valor) prompt += `${labels[campo] || campo}: ${valor}\n`;
  });

  const listaCinco = elementosObrigatorios.join(', ');
  prompt += `\n═══════════════════════════════════════════════════════════
VALIDAÇÃO INTERNA (faça antes de retornar):
═══════════════════════════════════════════════════════════

Antes de finalizar, VERIFIQUE:
1. O texto tem EXATAMENTE ${calibracao.periodos_exatos} períodos?
2. O texto tem entre ${calibracao.palavras_min} e ${calibracao.palavras_max} palavras?
3. Os elementos obrigatórios estão presentes: ${listaCinco}?
${criterios?.verificar_retomada_tese ? '4. A tese foi retomada sinteticamente antes da proposta?' : ''}

Se qualquer resposta for NÃO, REFAÇA antes de retornar.

═══════════════════════════════════════════════════════════

Retorne JSON:
{
  "conclusao": "Texto completo da conclusão (${calibracao.periodos_exatos} períodos)"
}`;

  return prompt;
}

function construirPrompt(
  subtabNome: string,
  calibracao: any,
  modelos: any[],
  dadosCompletos: Record<string, string>
): string {
  switch (subtabNome) {
    case 'desenvolvimento':
      return construirPromptDesenvolvimento(calibracao, modelos, dadosCompletos);
    case 'conclusao':
      return construirPromptConclusao(calibracao, modelos, dadosCompletos);
    default:
      return construirPromptIntroducao(calibracao, modelos, dadosCompletos);
  }
}

function validarTexto(
  subtabNome: string,
  texto: string,
  calibracao: any,
  dadosCompletos: Record<string, string>
): ValidationResult {
  switch (subtabNome) {
    case 'desenvolvimento':
      return validarDesenvolvimento(texto, calibracao, dadosCompletos);
    case 'conclusao':
      return validarConclusao(texto, calibracao, dadosCompletos);
    default:
      return validarIntroducao(texto, calibracao, dadosCompletos);
  }
}

function extrairTexto(resultado: any): string {
  return resultado.introducao || resultado.desenvolvimento || resultado.conclusao || resultado.texto || '';
}

function chaveResposta(subtabNome: string): string {
  switch (subtabNome) {
    case 'desenvolvimento': return 'desenvolvimento';
    case 'conclusao': return 'conclusao';
    default: return 'introducao';
  }
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
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada');

    const { userEmail, sessaoId, modoId, subtabNome: subtabNomeParam, dadosCompletos, creditosNecessarios }: GerarRequest = await req.json();

    if (!userEmail || !dadosCompletos || !creditosNecessarios) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios faltando' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deve ter sessaoId OU (modoId + subtabNome)
    if (!sessaoId && (!modoId || !subtabNomeParam)) {
      return new Response(
        JSON.stringify({ error: 'Forneça sessaoId ou (modoId + subtabNome)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Email:', userEmail, '| Créditos:', creditosNecessarios);

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

    // ── Resolver subtabNome e modoId (via sessão ou direto) ────────
    let resolvedModoId: string;
    let subtabNome: string;
    let resolvedSessaoId: string | null = null;

    if (sessaoId) {
      const { data: sessao, error: sessaoError } = await supabaseClient
        .from('jarvis_tutoria_sessoes')
        .select('id, modo_id, subtab_nome, user_id')
        .eq('id', sessaoId)
        .eq('user_id', user.id)
        .single();

      if (sessaoError || !sessao) {
        return new Response(
          JSON.stringify({ error: 'Sessão não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      resolvedModoId = sessao.modo_id;
      subtabNome = sessao.subtab_nome;
      resolvedSessaoId = sessao.id;
    } else {
      resolvedModoId = modoId!;
      subtabNome = subtabNomeParam!;
    }

    console.log('📄 Tipo de parágrafo:', subtabNome);

    // ── Buscar subtab ──────────────────────────────────────────────
    const { data: subtab, error: subtabError } = await supabaseClient
      .from('jarvis_tutoria_subtabs')
      .select('id, nome')
      .eq('nome', subtabNome)
      .eq('modo_id', resolvedModoId)
      .single();

    if (subtabError || !subtab) {
      return new Response(
        JSON.stringify({ error: 'Subtab não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Buscar calibração pedagógica ───────────────────────────────
    console.log('📐 Buscando calibração pedagógica para', subtabNome, '...');
    const { data: calibracaoData } = await supabaseClient
      .rpc('get_calibracao_by_subtab', { p_subtab_id: subtab.id });

    const defaultsPorTipo: Record<string, any> = {
      introducao: {
        periodos_exatos: 3, palavras_min: 80, palavras_max: 120,
        validacao_automatica: true, max_tentativas_geracao: 3,
        instrucoes_geracao: 'Use sintaxe concisa. A tese deve integrar os dois aspectos causais.',
        regras_composicao: {}
      },
      desenvolvimento: {
        periodos_exatos: 5, palavras_min: 100, palavras_max: 150,
        validacao_automatica: true, max_tentativas_geracao: 3,
        instrucoes_geracao: 'Construa parágrafo com célula argumentativa completa.',
        regras_composicao: {},
        criterios_celula_argumentativa: {
          validar_topico_frasal: true, validar_explicacao: true,
          validar_embasamento: true, validar_aplicacao_tema: true,
          validar_causalidade: true, validar_aprofundamento: false
        }
      },
      conclusao: {
        periodos_exatos: 3, palavras_min: 80, palavras_max: 120,
        validacao_automatica: true, max_tentativas_geracao: 3,
        instrucoes_geracao: 'Construa conclusão com proposta de intervenção C5.',
        regras_composicao: {},
        criterios_proposta_intervencao: {
          elementos_c5: ['agente', 'acao', 'meio_modo', 'finalidade', 'detalhamento'],
          elementos_obrigatorios: ['agente', 'acao', 'finalidade'],
          verificar_c5: true, verificar_retomada_tese: true
        }
      }
    };

    const calibracao = (calibracaoData && calibracaoData.length > 0)
      ? calibracaoData[0]
      : (defaultsPorTipo[subtabNome] ?? defaultsPorTipo['introducao']);

    console.log('📐 Calibração:', {
      tipo: subtabNome,
      periodos: calibracao.periodos_exatos,
      palavras: `${calibracao.palavras_min}-${calibracao.palavras_max}`,
      validacao: calibracao.validacao_automatica
    });

    // ── Buscar modelos de referência ───────────────────────────────
    console.log('📚 Buscando modelos de referência para', subtabNome, '...');
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
      .select('id, nome')
      .eq('id', resolvedModoId)
      .single();

    // ── LOOP DE GERAÇÃO COM VALIDAÇÃO ──────────────────────────────
    let textoGerado: string | null = null;
    let tentativas = 0;
    const maxTentativas = calibracao.max_tentativas_geracao || 3;
    let ultimaValidacao: ValidationResult | null = null;
    let tokens_input = 0;
    let tokens_output = 0;
    let tokens_total = 0;

    console.log(`🔄 Iniciando loop de geração (tipo: ${subtabNome}, max ${maxTentativas} tentativas)...`);

    while (!textoGerado && tentativas < maxTentativas) {
      tentativas++;
      console.log(`\n🔄 Tentativa ${tentativas}/${maxTentativas}`);

      const promptCalibrado = construirPrompt(subtabNome, calibracao, modelos || [], dadosCompletos);

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: promptCalibrado }],
          temperature: 0.7,
          max_tokens: 1024,
          response_format: { type: "json_object" }
        })
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const openaiData = await openaiResponse.json();
      tokens_input += openaiData.usage?.prompt_tokens || 0;
      tokens_output += openaiData.usage?.completion_tokens || 0;
      tokens_total += openaiData.usage?.total_tokens || 0;

      const resultado = JSON.parse(openaiData.choices[0].message.content);
      const textoTentativa = extrairTexto(resultado);

      console.log(`📝 Texto gerado (${contarPalavras(textoTentativa)} palavras)`);

      if (calibracao.validacao_automatica) {
        const validacao = validarTexto(subtabNome, textoTentativa, calibracao, dadosCompletos);
        ultimaValidacao = validacao;

        console.log(`🔍 Validação:`, {
          valido: validacao.valido,
          periodos: validacao.metricas.periodos,
          palavras: validacao.metricas.palavras,
          erros: validacao.erros.length,
        });

        if (validacao.valido) {
          textoGerado = textoTentativa;
        } else {
          console.log(`❌ Validação falhou:`, validacao.erros);
        }
      } else {
        textoGerado = textoTentativa;
      }
    }

    if (!textoGerado) {
      return new Response(
        JSON.stringify({
          error: `Não foi possível gerar ${subtabNome} dentro dos parâmetros pedagógicos`,
          detalhes: ultimaValidacao?.erros || [],
          tentativas_realizadas: tentativas
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const palavrasGeradas = contarPalavras(textoGerado);
    console.log(`\n✅ ${subtabNome} gerado após ${tentativas} tentativa(s)! (${palavrasGeradas} palavras)`);

    // ── Consumir créditos ──────────────────────────────────────────
    let creditosRestantes = user.jarvis_creditos;
    for (let i = 0; i < creditosNecessarios; i++) {
      const { data: newCredits, error: creditError } = await supabaseClient
        .rpc('consume_jarvis_credit', { target_user_id: user.id });
      if (creditError) throw new Error('Erro ao consumir créditos');
      creditosRestantes = newCredits;
    }

    // ── Salvar interação ───────────────────────────────────────────
    const chave = chaveResposta(subtabNome);
    await supabaseClient.from('jarvis_interactions').insert({
      user_id: user.id,
      modo_id: modo?.id,
      subtab_nome: subtabNome,
      etapa: 'geracao',
      sessao_id: resolvedSessaoId,
      texto_original: JSON.stringify(dadosCompletos),
      resposta_json: {
        [chave]: textoGerado,
        calibracao_aplicada: {
          tipo: subtabNome,
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
      tempo_resposta_ms: 0,
      tokens_input,
      tokens_output,
      tokens_total,
      creditos_consumidos: creditosNecessarios
    });

    // ── Atualizar sessão (somente no fluxo legado) ─────────────────
    if (resolvedSessaoId) {
      await supabaseClient
        .from('jarvis_tutoria_sessoes')
        .update({
          texto_gerado: textoGerado,
          etapa_atual: 'gerado',
          finalizado: true,
          creditos_consumidos: creditosNecessarios,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', resolvedSessaoId);
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
          tipo_paragrafo: subtabNome,
          tentativas_realizadas: tentativas,
          validacao_passou: ultimaValidacao?.valido ?? true,
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
