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

// Estimativa de tokens: ~4 caracteres por token (boa aproximação para português)
function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / 4);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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

    const modeloIA  = configIA?.model      ?? 'gpt-4o-mini';
    const tempIA    = configIA?.temperatura ?? 0.7;

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

    const maxTokens      = parseInt(cfg['tutor_max_tokens_resposta']              ?? '1500');
    const maxHistorico   = parseInt(cfg['tutor_max_historico_msgs']               ?? '20');
    const limiar         = parseInt(
      cfg[`jarvis_credito_tokens_${modulo}`] ??
      cfg['jarvis_credito_tokens_default']   ??
      '3000'
    );
    const systemPrompt   = cfg['tutor_system_prompt']
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

    // ── 6. Pré-check de créditos ─────────────────────────────────
    const { data: acumuladorRow } = await supabase
      .from('jarvis_credit_accumulator')
      .select('tokens_acumulados')
      .eq('aluno_id', aluno.id)
      .eq('modulo', modulo)
      .single();

    const acumuladorAtual = acumuladorRow?.tokens_acumulados ?? 0;

    // Estimativa conservadora: histórico + nova msg + system prompt + resposta estimada
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
        creditos_atuais:     saldoAtual,
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
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historico,
      { role: 'user', content: mensagem.trim() },
    ];

    console.log('🤖 Chamando OpenAI:', modeloIA);
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
        // Sem response_format: json_object — resposta é texto pedagógico livre
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
      conversation_id:  activeConversationId,
      role:             'assistant',
      conteudo:         respostaTexto,
      tokens_input:     tokensInput,
      tokens_output:    tokensOutput,
      tokens_total:     tokensTotal,
      provider:         'openai',
      modelo:           modeloIA,
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
      // Não bloqueia a resposta — log para investigação
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
