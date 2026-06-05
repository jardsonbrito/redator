import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TutorChatRequest {
  aluno_email:        string;
  conversation_id:    string | null;
  mensagem:           string;
  modulo?:            string;
  subtab_id?:         string | null;
  atalho_id?:         string | null;
  gerar_sintese?:     boolean;
  instrucao_interna?: string | null;
}

const SINTESE_PROMPT = `Você é o Tutor Jarvis. Analise o histórico COMPLETO desta sessão de tutoria e gere uma Síntese Pedagógica Detalhada.

REGRAS OBRIGATÓRIAS:
- Baseie-se EXCLUSIVAMENTE no que aconteceu nesta conversa. Cite exemplos reais, erros reais, acertos reais.
- Nunca escreva conclusões genéricas desconectadas da sessão.
- Use EXATAMENTE o formato abaixo, sem introduções ou comentários adicionais.
- PONTO DE VISTA OBRIGATÓRIO:
  • Seções para o aluno (O que foi estudado, O que você demonstrou saber, Dificuldades, Nível, Próximos passos, Participação): use SEGUNDA PESSOA — "você", "seu", "sua". Ex: "Você demonstrou..." / "Você apresentou dificuldade em..."
  • Seção "Orientação ao Professor": use TERCEIRA PESSOA — "o aluno", "ele". Esta seção é escrita para o professor.

---

## Síntese da Sessão de Tutoria

**O que foi estudado nesta sessão:**
[Segunda pessoa. Descreva os tópicos, exercícios e conteúdos que você estudou nesta sessão.]

**O que você demonstrou saber:**
[Segunda pessoa. Ex: "Você demonstrou segurança ao... como evidenciado quando..."]

**Dificuldades identificadas:**
[Segunda pessoa. Ex: "Durante os exercícios, você apresentou dificuldade em X, como evidenciado quando Y."]

**Nível estimado das habilidades trabalhadas:**
🟢 [Habilidade] — Bom domínio
🟡 [Habilidade] — Em desenvolvimento
🔴 [Habilidade] — Necessita reforço
[Inclua apenas as habilidades efetivamente trabalhadas]

**Próximos passos recomendados:**
[Segunda pessoa. Ex: "Pratique X antes de avançar para Y." / "Estude Z para consolidar..."]

**Participação na sessão:**
[Preencha com os dados fornecidos no campo DADOS DA SESSÃO abaixo]
• Tempo de estudo: [duração em minutos]
• Mensagens trocadas: [total]
• Exercícios realizados: [estimativa baseada na conversa]

---

**Orientação ao Professor**
[TERCEIRA PESSOA. Parágrafo técnico ao professor. Inclua: o que o aluno demonstrou saber, dificuldades específicas observadas com exemplos concretos, e recomendação pedagógica sobre o que reforçar. Evite generalidades.]`;

interface OpenAIMessage {
  role:    'system' | 'user' | 'assistant';
  content: string;
}

function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / 4);
}

// ── Parser de síntese pedagógica ─────────────────────────────────────────────
function parsearSintese(texto: string) {
  const secao = (chave: string): string => {
    const regex = new RegExp(`\\*\\*${chave}[:\\s*]*\\*\\*[:\\s]*([\\s\\S]*?)(?=\\n\\*\\*|\\n---|\$)`, 'i');
    return (texto.match(regex)?.[1] ?? '').trim();
  };

  const resumo = secao('O que foi estudado nesta sess[aã]o');

  // Habilidades: parse 🟢/🟡/🔴
  const habilidades: { label: string; nivel: string }[] = [];
  const habSecao = secao('N[ií]vel estimado das habilidades');
  for (const linha of habSecao.split('\n')) {
    const m = linha.match(/^([🟢🟡🔴])\s+(.+?)\s+[—-]\s+(.+)$/u);
    if (m) {
      const nivel = m[1] === '🟢' ? 'verde' : m[1] === '🟡' ? 'amarelo' : 'vermelho';
      habilidades.push({ label: m[2].trim(), nivel });
    }
  }

  // Dificuldades: linhas não-vazias da seção
  const difSecao = secao('Dificuldades identificadas');
  const dificuldades = difSecao.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

  // Próximos passos
  const passosSecao = secao('Pr[oó]ximos passos');
  const proximos_passos = passosSecao.split('\n').map(l => l.replace(/^[-•*\d.]+\s*/, '').trim()).filter(Boolean);

  // Orientação ao professor
  const orientacao_professor = secao('Orienta[cç][aã]o ao Professor');

  // Participação
  const durMatch = texto.match(/Tempo de estudo[:\s]+~?(\d+)\s*minuto/i);
  const msgsMatch = texto.match(/Mensagens trocadas[:\s]+(\d+)/i);
  const exerMatch = texto.match(/Exerc[ií]cios realizados[:\s]+(\d+)/i);
  const duracao_minutos      = durMatch  ? parseInt(durMatch[1])  : 0;
  const total_mensagens      = msgsMatch ? parseInt(msgsMatch[1]) : 0;
  const exercicios_estimados = exerMatch ? parseInt(exerMatch[1]) : 0;

  // Tags normalizadas para PEP futuro
  const textoLower = (dificuldades.join(' ') + ' ' + resumo).toLowerCase();
  const tagsMap: Record<string, string> = {
    'conectivo': 'conectivos', 'tese': 'tese', 'repertório': 'repertorio',
    'repertorio': 'repertorio', 'introdução': 'introducao', 'introduca': 'introducao',
    'desenvolvimento': 'desenvolvimento', 'conclusão': 'conclusao', 'conclusao': 'conclusao',
    'coesão': 'coesao', 'coesao': 'coesao', 'argumento': 'argumentacao',
    'argumentaç': 'argumentacao', 'proposta': 'proposta_intervencao', 'c5': 'proposta_intervencao',
  };
  const tags_dificuldades = [...new Set(
    Object.entries(tagsMap).filter(([k]) => textoLower.includes(k)).map(([, v]) => v)
  )];

  return { resumo, habilidades, dificuldades, proximos_passos, orientacao_professor,
           duracao_minutos, total_mensagens, exercicios_estimados, tags_dificuldades };
}

// ── Salvar síntese na tabela estruturada ─────────────────────────────────────
async function salvarSessaoSintetizada(
  supabase: ReturnType<typeof createClient>,
  params: {
    conversa_id: string;
    aluno_id: string;
    aluno_email: string;
    subtab_nome: string | null;
    texto_completo: string;
  }
): Promise<void> {
  try {
    const parsed = parsearSintese(params.texto_completo);

    // Busca turma e nome do aluno (mesma query, sem chamada extra)
    const { data: perfil } = await supabase
      .from('profiles')
      .select('turma, nome, sobrenome')
      .eq('id', params.aluno_id)
      .single();

    const nomeAluno = [(perfil as any)?.nome, (perfil as any)?.sobrenome]
      .filter(Boolean).join(' ') || null;

    await supabase.from('jarvis_sessoes_sintetizadas').insert({
      conversa_id:          params.conversa_id,
      aluno_id:             params.aluno_id,
      aluno_email:          params.aluno_email.toLowerCase().trim(),
      aluno_nome:           nomeAluno,
      turma:                (perfil as any)?.turma ?? null,
      subtab_nome:          params.subtab_nome,
      resumo:               parsed.resumo,
      habilidades:          parsed.habilidades,
      dificuldades:         parsed.dificuldades,
      proximos_passos:      parsed.proximos_passos,
      orientacao_professor: parsed.orientacao_professor,
      duracao_minutos:      parsed.duracao_minutos,
      total_mensagens:      parsed.total_mensagens,
      exercicios_estimados: parsed.exercicios_estimados,
      texto_completo:       params.texto_completo,
      tags_dificuldades:    parsed.tags_dificuldades,
    });
    console.log('📝 Sessão sintetizada salva com sucesso');
  } catch (err) {
    console.error('⚠️ Erro ao salvar sessão sintetizada:', err);
  }
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
      atalho_id: atalhoIdReq = null,
      gerar_sintese = false,
      instrucao_interna = null,
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
    const modeloIA   = configIA.data?.model      ?? 'gpt-4o-mini';
    const tempIA     = configIA.data?.temperatura ?? 0.7;
    const providerIA = (configIA.data?.provider ?? 'openai').toLowerCase();

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
    const nomeDoAluno = (aluno as any).nome?.trim() || null;
    const systemPromptBase = (cfg['tutor_system_prompt']
      ?? 'Você é o Tutor Jarvis, professor particular de português e redação ENEM. Ensine com profundidade, corrija com justificativa e estimule reflexão.')
      + (nomeDoAluno ? `\n\nO nome do aluno é ${nomeDoAluno}. Use o primeiro nome para se dirigir a ele durante toda a conversa.` : '');
    let systemPrompt = systemPromptBase;

    // ── 4. Buscar ou criar conversa ──────────────────────────────
    let activeConversationId = conversation_id;
    let activeSubtabId: string | null = null;
    let instrucaoInterna: string | null = instrucao_interna?.trim() || null;

    if (!activeConversationId) {
      const titulo = mensagem.trim().slice(0, 70).replace(/[.!?,;:]+$/, '').trim() || 'Nova conversa';
      const { data: nova, error: novaCfgErr } = await supabase
        .from('jarvis_conversations')
        .insert({
          aluno_id: aluno.id, modulo, titulo, provider: providerIA, modelo: modeloIA,
          subtab_id: subtabIdReq, atalho_id: atalhoIdReq, instrucao_interna: instrucaoInterna,
        })
        .select('id')
        .single();

      if (novaCfgErr || !nova) {
        console.error('❌ Erro ao criar conversa:', novaCfgErr);
        throw new Error('Erro ao criar conversa');
      }
      activeConversationId = nova.id;
      activeSubtabId = subtabIdReq;
      console.log('💬 Nova conversa:', activeConversationId, instrucaoInterna ? '+ instrução interna' : '');
    } else {
      const { data: convExiste } = await supabase
        .from('jarvis_conversations')
        .select('id, subtab_id, instrucao_interna')
        .eq('id', activeConversationId)
        .eq('aluno_id', aluno.id)
        .single();

      if (!convExiste) return json({ error: 'Conversa não encontrada' }, 404);
      activeSubtabId = (convExiste as any).subtab_id ?? null;
      // Reutiliza a instrução salva na conversa (garante persistência em todos os turnos)
      instrucaoInterna = instrucaoInterna || (convExiste as any).instrucao_interna || null;
    }

    // ── 4.3. Síntese da sessão ───────────────────────────────────
    if (gerar_sintese) {
      systemPrompt = SINTESE_PROMPT;
      console.log('📋 Gerando síntese da sessão');
    }

    // ── 4.5. Carregar prompt_tutor da subtab (modo especializado) ──
    // Ignorado quando gerando síntese (SINTESE_PROMPT já foi aplicado)
    let promptTutorConfigurado = false;
    if (activeSubtabId && !gerar_sintese) {
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
      .select('role, conteudo, created_at')
      .eq('conversation_id', activeConversationId)
      .eq('status', 'active')
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(maxHistorico);

    const historicoOrdenado = (historicoRaw ?? []).reverse();
    const historico: OpenAIMessage[] = historicoOrdenado
      .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.conteudo }));

    console.log('📚 Histórico:', historico.length, 'mensagens');

    // ── 5b. Dados de participação (injetados na síntese) ─────────
    let dadosSessao = '';
    if (gerar_sintese && historicoOrdenado.length > 0) {
      const primeira  = new Date((historicoOrdenado[0] as any).created_at);
      const ultima    = new Date((historicoOrdenado[historicoOrdenado.length - 1] as any).created_at);
      const duracaoMin = Math.max(1, Math.round((ultima.getTime() - primeira.getTime()) / 60000));
      const totalMsgs  = historicoOrdenado.length;
      dadosSessao = `\nDADOS DA SESSÃO (use no campo Participação na sessão):\n• Tempo de estudo: aproximadamente ${duracaoMin} minuto${duracaoMin !== 1 ? 's' : ''}\n• Mensagens trocadas: ${totalMsgs}\n• Exercícios realizados: [estime com base na conversa]`;
    }

    // ── 5c. Contexto pedagógico ──────────────────────────────────────────────
    // instrucaoInterna presente (request ou DB) = reinjetar como system em todo turno
    const ehAtalhoInstrucao = !gerar_sintese && !!instrucaoInterna;

    const contextoPedagogicoPromise = (gerar_sintese || promptTutorConfigurado || ehAtalhoInstrucao)
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

    // Montagem final das mensagens
    if (ehAtalhoInstrucao) {
      // Reinjetar instrução como system em TODOS os turnos da conversa
      messages.push({ role: 'system', content: instrucaoInterna! });
      messages.push({ role: 'user', content: mensagem.trim() });
      console.log(`📎 Instrução interna: ${instrucaoInterna!.length} chars (turno ${Math.floor(historico.length/2) + 1})`);
    } else if (gerar_sintese && dadosSessao) {
      messages.push({ role: 'user', content: `Gere a síntese pedagógica desta sessão.${dadosSessao}` });
    } else {
      messages.push({ role: 'user', content: mensagem.trim() });
    }

    const maxTokensFinal = gerar_sintese ? Math.max(maxTokens, 2000) : maxTokens;
    console.log(`🤖 Chamando ${providerIA}/${modeloIA}`, gerar_sintese ? '+ síntese' : contextoPedagogico ? '+ contexto pedagógico' : '');
    const t0 = Date.now();

    let respostaTexto: string;
    let tokensInput = 0, tokensOutput = 0, tokensTotal = 0;

    if (providerIA === 'anthropic') {
      // ── Anthropic Claude ──────────────────────────────────────────
      const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
      if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurada');

      // Anthropic separa system das mensagens
      const systemMsg = messages.find(m => m.role === 'system')?.content ?? '';
      const userMsgs  = messages.filter(m => m.role !== 'system');

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      modeloIA,
          max_tokens: maxTokensFinal,
          system:     systemMsg,
          messages:   userMsgs,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(`Anthropic API Error: ${err.error?.message ?? JSON.stringify(err)}`);
      }
      const data = await resp.json();
      respostaTexto = data.content?.[0]?.text ?? '';
      tokensInput   = data.usage?.input_tokens  ?? 0;
      tokensOutput  = data.usage?.output_tokens ?? 0;
      tokensTotal   = tokensInput + tokensOutput;

    } else {
      // ── OpenAI (padrão) ───────────────────────────────────────────
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model:       modeloIA,
          messages,
          temperature: tempIA,
          max_tokens:  maxTokensFinal,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(`OpenAI API Error: ${err.error?.message ?? 'Unknown error'}`);
      }
      const data  = await resp.json();
      respostaTexto = data.choices[0].message.content as string;
      tokensInput   = data.usage?.prompt_tokens     ?? 0;
      tokensOutput  = data.usage?.completion_tokens ?? 0;
      tokensTotal   = data.usage?.total_tokens      ?? 0;
    }

    const tempoResposta = Date.now() - t0;

    console.log(`⏱️ ${tempoResposta}ms | tokens: ${tokensTotal} (in:${tokensInput} out:${tokensOutput})`);

    // ── 9. Salvar resposta do assistente ─────────────────────────
    await supabase.from('jarvis_messages').insert({
      conversation_id:   activeConversationId,
      role:              'assistant',
      conteudo:          respostaTexto,
      tokens_input:      tokensInput,
      tokens_output:     tokensOutput,
      tokens_total:      tokensTotal,
      provider:          providerIA,
      modelo:            modeloIA,
      tempo_resposta_ms: tempoResposta,
    });

    // ── 9b. Se for síntese, salvar na tabela estruturada ─────────
    if (gerar_sintese && respostaTexto.includes('Síntese da Sessão')) {
      await salvarSessaoSintetizada(supabase, {
        conversa_id:    activeConversationId,
        aluno_id:       aluno.id,
        aluno_email:    aluno_email,
        subtab_nome:    activeSubtabId
          ? (await supabase.from('jarvis_tutoria_subtabs').select('nome').eq('id', activeSubtabId).single()).data?.nome ?? null
          : null,
        texto_completo: respostaTexto,
      });
    }

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
