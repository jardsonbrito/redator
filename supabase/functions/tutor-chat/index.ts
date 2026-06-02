import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TutorChatRequest {
  aluno_email:     string;
  conversation_id: string | null;
  mensagem:        string;
  modulo?:         string;
  subtab_id?:      string | null;
  gerar_sintese?:  boolean;
}

const SINTESE_PROMPT = `Você é o Tutor Jarvis. Analise o histórico completo desta sessão de tutoria e gere uma Síntese Pedagógica estruturada.

Use EXATAMENTE este formato, sem introduções ou comentários adicionais:

## Síntese da Sessão de Tutoria

**O que foi estudado nesta sessão:**
[Descreva os tópicos, exercícios e conteúdos abordados]

**O que o aluno demonstrou saber:**
[Liste os pontos em que o aluno mostrou compreensão ou acerto]

**Dificuldades identificadas:**
[Liste os pontos onde o aluno apresentou dificuldade, erro ou confusão]

**Próximos passos recomendados:**
[Liste 3 a 5 ações concretas e específicas para o aluno praticar]

---

**Orientação ao Professor**
[Escreva um parágrafo direto ao professor descrevendo o desempenho observado, as dificuldades específicas identificadas e o que deve ser reforçado pedagogicamente. Tom: técnico, objetivo e colaborativo.]`;

interface OpenAIMessage {
  role:    'system' | 'user' | 'assistant';
  content: string;
}

function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / 4);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Detecção de intenção pedagógica ──────────────────────────────────────────
function detectarIntencaoPedagogica(mensagem: string): 'introducao' | 'desenvolvimento' | 'conclusao' | null {
  const msg = mensagem.toLowerCase();

  const isIntroducao = /introduç|intro\b|tese\b|contextuali|repertório|repertorio|\bc2\b|início\b|começ|abertura|parágrafo inicial|primeiro parágrafo/.test(msg);
  const isDesenvolvimento = /desenvolviment|argum|argumentaç|\bc3\b|tópico frasal|topico frasal|célula arg|celula arg|embasament|segundo parágrafo|terceiro parágrafo/.test(msg);
  const isConclusao = /conclus|\bc5\b|proposta\b|intervenç|encerrament|último parágrafo|agente\b|finalidade\b/.test(msg);

  if (isIntroducao) return 'introducao';
  if (isDesenvolvimento) return 'desenvolvimento';
  if (isConclusao) return 'conclusao';
  return null;
}

// ── Busca contexto pedagógico da base interna do sistema ─────────────────────
async function buscarContextoPedagogico(
  supabase: ReturnType<typeof createClient>,
  mensagem: string,
  forcedSubtabId?: string | null,
): Promise<string | null> {
  try {
    let subtab: { id: string; label: string } | null = null;

    if (forcedSubtabId) {
      // Modo especialista: carrega subtab diretamente pelo id
      const { data } = await supabase
        .from('jarvis_tutoria_subtabs')
        .select('id, label')
        .eq('id', forcedSubtabId)
        .eq('habilitada', true)
        .single();
      subtab = data ?? null;
    } else {
      // Modo conversacional: detecta intenção por regex
      const intencao = detectarIntencaoPedagogica(mensagem);
      if (!intencao) return null;
      const { data } = await supabase
        .from('jarvis_tutoria_subtabs')
        .select('id, label')
        .eq('nome', intencao)
        .eq('habilitada', true)
        .single();
      subtab = data ?? null;
    }

    if (!subtab) return null;

    const [calibRes, modelosRes] = await Promise.all([
      supabase
        .from('jarvis_tutoria_calibracao')
        .select('instrucoes_geracao, regras_composicao, criterios_celula_argumentativa, criterios_proposta_intervencao')
        .eq('subtab_id', subtab.id)
        .single(),
      supabase
        .from('jarvis_tutoria_modelos_referencia')
        .select('titulo, tema, texto_modelo')
        .eq('subtab_id', subtab.id)
        .eq('ativo', true)
        .order('ordem_prioridade', { ascending: true })
        .limit(2),
    ]);

    const calib   = calibRes.data;
    const modelos = modelosRes.data ?? [];

    if (!calib && modelos.length === 0) return null;

    let bloco = `## METODOLOGIA INTERNA — ${subtab.label.toUpperCase()} (Laboratório do Redator)\n`;
    bloco += `Use os critérios e modelos abaixo como referência pedagógica ao responder. Priorize a metodologia do sistema sobre respostas genéricas.\n`;

    if (calib) {
      if (calib.instrucoes_geracao) {
        bloco += `\n### Critérios de composição\n${calib.instrucoes_geracao}\n`;
      }

      const regras = calib.regras_composicao as Record<string, any> | null;
      if (regras?.estrutura_periodos?.length) {
        bloco += '\nEstrutura de períodos:\n';
        for (const p of regras.estrutura_periodos as string[]) bloco += `- ${p}\n`;
      }
      if (regras?.restricoes?.length) {
        bloco += '\nRestrições:\n';
        for (const r of regras.restricoes as string[]) bloco += `- ${r}\n`;
      }

      const c5 = calib.criterios_proposta_intervencao as Record<string, any> | null;
      if (c5?.elementos_c5?.length) {
        bloco += '\nElementos C5 obrigatórios (proposta de intervenção):\n';
        for (const elem of c5.elementos_c5 as string[]) {
          const desc = c5.descricoes?.[elem] ?? '';
          bloco += `- ${elem}: ${desc}\n`;
        }
      }

      const cel = calib.criterios_celula_argumentativa as Record<string, any> | null;
      if (cel?.elementos_obrigatorios?.length) {
        bloco += '\nCélula argumentativa — elementos obrigatórios:\n';
        for (const elem of cel.elementos_obrigatorios as string[]) {
          const desc = cel.descricoes?.[elem] ?? '';
          bloco += `- ${elem}: ${desc}\n`;
        }
      }
    }

    if (modelos.length > 0) {
      bloco += `\n### Modelos de referência\n`;
      for (const m of modelos as { titulo: string; tema: string; texto_modelo: string }[]) {
        bloco += `\n**${m.titulo}** — Tema: ${m.tema}\n`;
        const preview = m.texto_modelo?.slice(0, 350) ?? '';
        bloco += preview + (m.texto_modelo?.length > 350 ? '…' : '') + '\n';
      }
    }

    const modo = forcedSubtabId ? subtab.label : subtab.label;
    console.log(`📚 Contexto pedagógico injetado: ${modo} (~${estimarTokens(bloco)} tokens)`);
    return bloco;
  } catch (err) {
    console.warn('⚠️ Erro ao buscar contexto pedagógico:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🎓 Tutor Jarvis — Iniciando processamento');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada');

    const {
      aluno_email,
      conversation_id,
      mensagem,
      modulo = 'tutor',
      subtab_id: subtabIdReq = null,
      gerar_sintese = false,
    }: TutorChatRequest = await req.json();

    if (!aluno_email?.trim() || !mensagem?.trim()) {
      return json({ error: 'aluno_email e mensagem são obrigatórios' }, 400);
    }

    // ── 1. Buscar aluno por email ────────────────────────────────
    const { data: aluno, error: alunoError } = await supabase
      .from('profiles')
      .select('id, nome, email, jarvis_creditos, creditos')
      .eq('email', aluno_email.toLowerCase().trim())
      .eq('user_type', 'aluno')
      .single();

    if (alunoError || !aluno) {
      return json({ error: 'Aluno não encontrado' }, 404);
    }

    console.log('👤', aluno.nome, '| Créditos Jarvis:', aluno.jarvis_creditos, '| Créditos redação:', aluno.creditos);

    // ── 2. Verificar se módulo está habilitado ───────────────────
    const { data: habilitadoCfg } = await supabase
      .from('jarvis_system_config')
      .select('valor')
      .eq('chave', 'tutor_habilitado')
      .single();

    if (habilitadoCfg?.valor === 'false') {
      return json({ error: 'O Tutor Jarvis está temporariamente desabilitado' }, 403);
    }

    // ── 2.5. Verificar permissão de plano ────────────────────────
    // Permissão vem antes de crédito — aluno sem acesso não consome nada.
    const { data: temAcessoJarvis } = await supabase
      .rpc('check_aluno_jarvis_access', { p_aluno_email: aluno_email.toLowerCase().trim() });

    if (!temAcessoJarvis) {
      return json({ error: 'O Jarvis não está disponível no seu plano atual.' }, 403);
    }

    // ── 2.6. Verificar se o plano permite fallback de crédito ─────
    const [configIA, fallbackResult] = await Promise.all([
      supabase.rpc('get_active_jarvis_config').single(),
      supabase.rpc('get_aluno_jarvis_fallback', { p_aluno_email: aluno_email.toLowerCase().trim() }),
    ]);

    const fallbackPermitido = fallbackResult.data ?? true;

    // ── 3. Buscar configurações de IA ────────────────────────────
    const modeloIA = configIA.data?.model      ?? 'gpt-4o-mini';
    const tempIA   = configIA.data?.temperatura ?? 0.7;

    const cfgMap = await supabase
      .from('jarvis_system_config')
      .select('chave, valor')
      .in('chave', [
        'tutor_max_tokens_resposta',
        'tutor_max_historico_msgs',
        'tutor_system_prompt',
        `jarvis_credito_tokens_${modulo}`,
        'jarvis_credito_tokens_default',
      ]);

    const cfg: Record<string, string> = {};
    for (const row of cfgMap.data ?? []) cfg[row.chave] = row.valor;

    const maxTokens    = parseInt(cfg['tutor_max_tokens_resposta']              ?? '1500');
    const maxHistorico = parseInt(cfg['tutor_max_historico_msgs']               ?? '20');
    const limiar       = parseInt(
      cfg[`jarvis_credito_tokens_${modulo}`] ??
      cfg['jarvis_credito_tokens_default']   ??
      '3000'
    );
    const systemPromptBase = cfg['tutor_system_prompt']
      ?? 'Você é o Tutor Jarvis, professor particular de português e redação ENEM. Ensine com profundidade, corrija com justificativa e estimule reflexão.';
    let systemPrompt = systemPromptBase;

    // ── 4. Buscar ou criar conversa ──────────────────────────────
    let activeConversationId = conversation_id;
    let activeSubtabId: string | null = null;

    if (!activeConversationId) {
      const titulo = mensagem.trim().slice(0, 70).replace(/[.!?,;:]+$/, '').trim() || 'Nova conversa';
      const { data: nova, error: novaCfgErr } = await supabase
        .from('jarvis_conversations')
        .insert({ aluno_id: aluno.id, modulo, titulo, provider: 'openai', modelo: modeloIA, subtab_id: subtabIdReq })
        .select('id')
        .single();

      if (novaCfgErr || !nova) {
        console.error('❌ Erro ao criar conversa:', novaCfgErr);
        throw new Error('Erro ao criar conversa');
      }
      activeConversationId = nova.id;
      activeSubtabId = subtabIdReq;
      console.log('💬 Nova conversa:', activeConversationId, activeSubtabId ? `(subtab: ${activeSubtabId})` : '');
    } else {
      const { data: convExiste } = await supabase
        .from('jarvis_conversations')
        .select('id, subtab_id')
        .eq('id', activeConversationId)
        .eq('aluno_id', aluno.id)
        .single();

      if (!convExiste) return json({ error: 'Conversa não encontrada' }, 404);
      activeSubtabId = (convExiste as any).subtab_id ?? null;
    }

    // ── 4.3. Síntese da sessão ───────────────────────────────────
    if (gerar_sintese) {
      systemPrompt = SINTESE_PROMPT;
      console.log('📋 Gerando síntese da sessão');
    }

    // ── 4.5. Carregar prompt_tutor da subtab (modo especializado) ──
    let promptTutorConfigurado = false;
    if (activeSubtabId) {
      try {
        const { data: calibSubtab } = await supabase
          .from('jarvis_tutoria_calibracao')
          .select('prompt_tutor, jarvis_tutoria_subtabs!inner(label)')
          .eq('subtab_id', activeSubtabId)
          .single();
        const subtabLabel = (calibSubtab as any)?.jarvis_tutoria_subtabs?.label ?? 'etapa';
        if (calibSubtab?.prompt_tutor?.trim()) {
          systemPrompt = calibSubtab.prompt_tutor.trim();
          promptTutorConfigurado = true;
          console.log(`🎯 prompt_tutor configurado: ${subtabLabel}`);
        } else {
          systemPrompt = systemPromptBase + `\n\nMODO ESPECIALISTA — ${subtabLabel.toUpperCase()}\nVocê está atuando exclusivamente como especialista em ${subtabLabel} de redação ENEM. Todas as suas respostas, exemplos, exercícios e correções devem girar em torno desta etapa.`;
          console.log(`🎯 Modo especialista sem prompt_tutor: ${subtabLabel} (fallback)`);
        }
      } catch (err) {
        console.warn('⚠️ Erro ao carregar prompt_tutor:', err);
      }
    }

    // ── 5. Buscar histórico recente (janela deslizante) ──────────
    const { data: historicoRaw } = await supabase
      .from('jarvis_messages')
      .select('role, conteudo')
      .eq('conversation_id', activeConversationId)
      .eq('status', 'active')
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(maxHistorico);

    const historico: OpenAIMessage[] = (historicoRaw ?? [])
      .reverse()
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.conteudo }));

    console.log('📚 Histórico:', historico.length, 'mensagens');

    // ── 5b. Contexto pedagógico ──────────────────────────────────────────────
    // Síntese ou prompt_tutor configurado: sem injeção extra
    // Sem prompt_tutor mas com subtab: injeta calibração da subtab específica
    // Modo livre: detecta intenção por regex
    const contextoPedagogicoPromise = (gerar_sintese || promptTutorConfigurado)
      ? Promise.resolve(null)
      : buscarContextoPedagogico(supabase, mensagem.trim(), activeSubtabId);

    // ── 6. Pré-check de créditos ─────────────────────────────────
    const { data: acumuladorRow } = await supabase
      .from('jarvis_credit_accumulator')
      .select('tokens_acumulados')
      .eq('aluno_id', aluno.id)
      .eq('modulo', modulo)
      .single();

    const acumuladorAtual = acumuladorRow?.tokens_acumulados ?? 0;

    const textoContexto   = systemPrompt + historico.map(m => m.content).join(' ') + mensagem;
    const estimativaInput = estimarTokens(textoContexto);
    const estimativaTotal = estimativaInput + Math.min(maxTokens, 700);
    const projecao        = acumuladorAtual + estimativaTotal;
    const creditosNecessarios = Math.floor(projecao / limiar);
    const saldoJarvis     = aluno.jarvis_creditos ?? 0;
    const saldoRedacao    = aluno.creditos ?? 0;

    console.log(`💰 Acum: ${acumuladorAtual} | Projeção: ${projecao} | Limiar: ${limiar} | Créditos necessários: ${creditosNecessarios} | Saldo Jarvis: ${saldoJarvis} | Saldo Redação: ${saldoRedacao} | Fallback: ${fallbackPermitido}`);

    // Decide qual saldo usar: jarvis primeiro, fallback se permitido
    const usarFallback = creditosNecessarios > 0
      && saldoJarvis < creditosNecessarios
      && fallbackPermitido
      && saldoRedacao >= creditosNecessarios;

    if (creditosNecessarios > 0 && saldoJarvis < creditosNecessarios && !usarFallback) {
      return json({
        error: 'Créditos insuficientes para continuar o estudo',
        creditos_atuais:        saldoJarvis,
        creditos_necessarios:   creditosNecessarios,
        creditos_redacao:       saldoRedacao,
        fallback_habilitado:    fallbackPermitido,
      }, 402);
    }

    console.log(usarFallback
      ? `🔄 Usando fallback: ${creditosNecessarios} crédito(s) de redação`
      : `✅ Usando créditos Jarvis`
    );

    // ── 7. Salvar mensagem do usuário (antes da chamada à IA) ─────
    await supabase.from('jarvis_messages').insert({
      conversation_id: activeConversationId,
      role:            'user',
      conteudo:        mensagem.trim(),
    });

    // ── 8. Montar array de mensagens e chamar OpenAI ─────────────
    const contextoPedagogico = await contextoPedagogicoPromise;

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historico,
    ];

    if (contextoPedagogico) {
      messages.push({ role: 'system', content: contextoPedagogico });
    }

    messages.push({ role: 'user', content: mensagem.trim() });

    console.log('🤖 Chamando OpenAI:', modeloIA, contextoPedagogico ? '+ contexto pedagógico' : '');
    const t0 = Date.now();

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:       modeloIA,
        messages,
        temperature: tempIA,
        max_tokens:  maxTokens,
      }),
    });

    if (!openaiResponse.ok) {
      const errData = await openaiResponse.json();
      console.error('❌ OpenAI error:', errData);
      throw new Error(`OpenAI API Error: ${errData.error?.message ?? 'Unknown error'}`);
    }

    const openaiData    = await openaiResponse.json();
    const tempoResposta = Date.now() - t0;
    const respostaTexto = openaiData.choices[0].message.content as string;
    const tokensInput   = openaiData.usage?.prompt_tokens     ?? 0;
    const tokensOutput  = openaiData.usage?.completion_tokens ?? 0;
    const tokensTotal   = openaiData.usage?.total_tokens      ?? 0;

    console.log(`⏱️ ${tempoResposta}ms | tokens: ${tokensTotal} (in:${tokensInput} out:${tokensOutput})`);

    // ── 9. Salvar resposta do assistente ─────────────────────────
    await supabase.from('jarvis_messages').insert({
      conversation_id:   activeConversationId,
      role:              'assistant',
      conteudo:          respostaTexto,
      tokens_input:      tokensInput,
      tokens_output:     tokensOutput,
      tokens_total:      tokensTotal,
      provider:          'openai',
      modelo:            modeloIA,
      tempo_resposta_ms: tempoResposta,
    });

    // ── 10. Processar créditos (acumulador progressivo) ───────────
    let creditosDebitados = 0;
    let novoAcumulador    = acumuladorAtual + tokensTotal;
    let saldoRestante     = usarFallback ? saldoRedacao : saldoJarvis;

    try {
      const rpcName = usarFallback ? 'process_tutor_credit_redacao' : 'process_tutor_credit';
      const { data: creditResult, error: creditError } = await supabase
        .rpc(rpcName, {
          p_aluno_id:     aluno.id,
          p_modulo:       modulo,
          p_tokens_novos: tokensTotal,
        });

      if (creditError) {
        console.error('⚠️ Erro ao processar créditos:', creditError);
      } else if (creditResult?.[0]) {
        creditosDebitados = creditResult[0].creditos_debitados;
        novoAcumulador    = creditResult[0].acumulador_atual;
        saldoRestante     = creditResult[0].saldo_restante;
        console.log(`💳 ${usarFallback ? '[FALLBACK]' : ''} Débito: ${creditosDebitados} | Acum: ${novoAcumulador} | Saldo: ${saldoRestante}`);
      }
    } catch (err) {
      console.error('⚠️ Exceção ao processar créditos:', err);
    }

    // ── 11. Atualizar totais da conversa ─────────────────────────
    await supabase.rpc('increment_tutor_conversation_totals', {
      p_conversation_id: activeConversationId,
      p_tokens:          tokensTotal,
      p_creditos:        creditosDebitados,
    });

    // ── 12. Retornar resposta ────────────────────────────────────
    return json({
      success:            true,
      resposta:           respostaTexto,
      conversation_id:    activeConversationId,
      tokens_usados:      tokensTotal,
      creditos_debitados: creditosDebitados,
      creditos_restantes: saldoRestante,
      usou_fallback:      usarFallback,
      acumulador_tokens:  novoAcumulador,
      tempo_resposta_ms:  tempoResposta,
    });

  } catch (error) {
    console.error('💥 Erro no Tutor Jarvis:', error);
    return json({
      error:   'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
