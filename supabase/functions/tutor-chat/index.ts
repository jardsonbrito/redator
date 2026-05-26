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
}

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
// Retorna qual seção da redação o aluno está perguntando (ou null se nenhuma)
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
// Consulta calibração e modelos de referência da Tutoria; retorna bloco de texto
// formatado para injeção como contexto antes da chamada à OpenAI.
// Nunca bloqueia o fluxo — retorna null em caso de erro ou sem dados.
async function buscarContextoPedagogico(
  supabase: ReturnType<typeof createClient>,
  mensagem: string,
): Promise<string | null> {
  const intencao = detectarIntencaoPedagogica(mensagem);
  if (!intencao) return null;

  try {
    // Busca subtab
    const { data: subtab } = await supabase
      .from('jarvis_tutoria_subtabs')
      .select('id, label')
      .eq('nome', intencao)
      .eq('habilitada', true)
      .single();

    if (!subtab) return null;

    // Busca calibração e modelos em paralelo
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

      // Elementos C5 (conclusão)
      const c5 = calib.criterios_proposta_intervencao as Record<string, any> | null;
      if (c5?.elementos_c5?.length) {
        bloco += '\nElementos C5 obrigatórios (proposta de intervenção):\n';
        for (const elem of c5.elementos_c5 as string[]) {
          const desc = c5.descricoes?.[elem] ?? '';
          bloco += `- ${elem}: ${desc}\n`;
        }
      }

      // Célula argumentativa (desenvolvimento)
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

    console.log(`📚 Contexto pedagógico injetado: ${intencao} (~${estimarTokens(bloco)} tokens)`);
    return bloco;
  } catch (err) {
    // Nunca bloqueia o fluxo principal
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
    }: TutorChatRequest = await req.json();

    if (!aluno_email?.trim() || !mensagem?.trim()) {
      return json({ error: 'aluno_email e mensagem são obrigatórios' }, 400);
    }

    // ── 1. Buscar aluno por email ────────────────────────────────
    const { data: aluno, error: alunoError } = await supabase
      .from('profiles')
      .select('id, nome, email, jarvis_creditos')
      .eq('email', aluno_email.toLowerCase().trim())
      .eq('user_type', 'aluno')
      .single();

    if (alunoError || !aluno) {
      return json({ error: 'Aluno não encontrado' }, 404);
    }

    console.log('👤', aluno.nome, '| Créditos:', aluno.jarvis_creditos);

    // ── 2. Verificar se módulo está habilitado ───────────────────
    const { data: habilitadoCfg } = await supabase
      .from('jarvis_system_config')
      .select('valor')
      .eq('chave', 'tutor_habilitado')
      .single();

    if (habilitadoCfg?.valor === 'false') {
      return json({ error: 'O Tutor Jarvis está temporariamente desabilitado' }, 403);
    }

    // ── 3. Buscar configurações de IA ────────────────────────────
    const { data: configIA } = await supabase
      .rpc('get_active_jarvis_config')
      .single();

    const modeloIA = configIA?.model      ?? 'gpt-4o-mini';
    const tempIA   = configIA?.temperatura ?? 0.7;

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
    const systemPrompt = cfg['tutor_system_prompt']
      ?? 'Você é o Tutor Jarvis, professor particular de português e redação ENEM. Ensine com profundidade, corrija com justificativa e estimule reflexão.';

    // ── 4. Buscar ou criar conversa ──────────────────────────────
    let activeConversationId = conversation_id;

    if (!activeConversationId) {
      const titulo = mensagem.trim().slice(0, 70).replace(/[.!?,;:]+$/, '').trim() || 'Nova conversa';
      const { data: nova, error: novaCfgErr } = await supabase
        .from('jarvis_conversations')
        .insert({ aluno_id: aluno.id, modulo, titulo, provider: 'openai', modelo: modeloIA })
        .select('id')
        .single();

      if (novaCfgErr || !nova) {
        console.error('❌ Erro ao criar conversa:', novaCfgErr);
        throw new Error('Erro ao criar conversa');
      }
      activeConversationId = nova.id;
      console.log('💬 Nova conversa:', activeConversationId);
    } else {
      const { data: convExiste } = await supabase
        .from('jarvis_conversations')
        .select('id')
        .eq('id', activeConversationId)
        .eq('aluno_id', aluno.id)
        .single();

      if (!convExiste) return json({ error: 'Conversa não encontrada' }, 404);
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

    // ── 5b. Buscar contexto pedagógico da base interna ───────────
    // (em paralelo com o pré-check de créditos abaixo)
    const contextoPedagogicoPromise = buscarContextoPedagogico(supabase, mensagem.trim());

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
    const saldoAtual      = aluno.jarvis_creditos ?? 0;

    console.log(`💰 Acum: ${acumuladorAtual} | Projeção: ${projecao} | Limiar: ${limiar} | Créditos necessários: ${creditosNecessarios} | Saldo: ${saldoAtual}`);

    if (creditosNecessarios > 0 && saldoAtual < creditosNecessarios) {
      return json({
        error: 'Créditos insuficientes para continuar o estudo',
        creditos_atuais:      saldoAtual,
        creditos_necessarios: creditosNecessarios,
      }, 402);
    }

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

    // Injeção de contexto pedagógico (quando detectado) — vem antes da msg do aluno
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
    let saldoRestante     = saldoAtual;

    try {
      const { data: creditResult, error: creditError } = await supabase
        .rpc('process_tutor_credit', {
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
        console.log(`💳 Débito: ${creditosDebitados} | Acum: ${novoAcumulador} | Saldo: ${saldoRestante}`);
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
