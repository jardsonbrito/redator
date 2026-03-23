import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JarvisRequest {
  texto: string;
  userEmail: string;
  modo_id?: string; // opcional — fallback para o modo "analisar" se ausente
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🤖 Jarvis Assistant - Iniciando processamento');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { texto, userEmail, modo_id }: JarvisRequest = await req.json();

    if (!texto || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'Texto e email são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Email:', userEmail);
    console.log('🎯 Modo ID:', modo_id ?? '(não informado — usando fallback)');

    // ── Buscar usuário por email (sem Supabase Auth) ──────────────
    const { data: user, error: userError } = await supabaseClient
      .from('profiles')
      .select('id, jarvis_creditos, nome, email')
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

    // ── Buscar configuração global ────────────────────────────────
    const { data: config, error: configError } = await supabaseClient
      .rpc('get_active_jarvis_config')
      .single();

    if (configError || !config) {
      console.error('❌ Configuração não encontrada:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração do Jarvis não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Buscar modo ───────────────────────────────────────────────
    // Se modo_id não foi enviado (clientes antigos), usa o modo "analisar".
    let modoQuery = supabaseClient
      .from('jarvis_modos')
      .select('id, nome, label, system_prompt, campos_resposta')
      .eq('ativo', true);

    if (modo_id) {
      modoQuery = modoQuery.eq('id', modo_id);
    } else {
      modoQuery = modoQuery.eq('nome', 'analisar');
    }

    const { data: modo, error: modoError } = await modoQuery.single();

    if (modoError || !modo) {
      console.error('❌ Modo não encontrado:', modoError);
      return new Response(
        JSON.stringify({ error: 'Modo do Jarvis não encontrado ou inativo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('⚙️ Config:', config.model, '| Modo:', modo.nome, '(', modo.label, ')');

    // ── Validar limite de palavras ────────────────────────────────
    const palavras = texto.trim().split(/\s+/).length;
    console.log('📊 Palavras:', palavras, '| Limite:', config.limite_palavras_entrada);

    if (palavras > config.limite_palavras_entrada) {
      return new Response(
        JSON.stringify({
          error: `Texto muito longo. Máximo: ${config.limite_palavras_entrada} palavras`,
          palavras_atuais: palavras,
          limite: config.limite_palavras_entrada
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Verificar créditos ────────────────────────────────────────
    if ((user.jarvis_creditos || 0) < 1) {
      return new Response(
        JSON.stringify({
          error: 'Créditos Jarvis insuficientes',
          creditos_atuais: user.jarvis_creditos || 0
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Chamar OpenAI com o prompt do modo ────────────────────────
    console.log('🤖 Chamando OpenAI com prompt do modo:', modo.nome);
    const startTime = Date.now();

    const messages: OpenAIMessage[] = [
      { role: 'system', content: modo.system_prompt },
      { role: 'user', content: `Analise este texto:\n\n${texto}` }
    ];

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperatura,
        max_tokens: config.max_tokens,
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

    console.log(`⏱️ Tempo de resposta: ${responseTime}ms`);

    // ── Parsear e validar resposta conforme campos_resposta do modo ─
    const content = openaiData.choices[0].message.content;
    const aiRaw: Record<string, unknown> = JSON.parse(content);

    // Normaliza todos os valores para string simples, independente do que a IA retornar
    function normalizarParaString(valor: unknown): string {
      if (typeof valor === 'string') return valor;
      if (valor === null || valor === undefined) return '';
      if (Array.isArray(valor)) {
        return valor.map((item: unknown) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            // Extrai campos textuais comuns usados pela IA em diagnósticos estruturados
            const partes: string[] = [];
            if (obj['subcategoria']) partes.push(String(obj['subcategoria']));
            if (obj['explicação'] || obj['explicacao']) partes.push(String(obj['explicação'] ?? obj['explicacao']));
            if (obj['trecho']) partes.push(`Trecho: "${obj['trecho']}"`);
            return partes.length > 0 ? partes.join(' — ') : JSON.stringify(item);
          }
          return String(item);
        }).filter(Boolean).join('\n');
      }
      if (typeof valor === 'object') {
        const obj = valor as Record<string, unknown>;
        return Object.entries(obj)
          .map(([, v]) => normalizarParaString(v))
          .filter(Boolean).join('\n');
      }
      return String(valor);
    }

    const aiResponse: Record<string, string> = {};
    for (const [chave, val] of Object.entries(aiRaw)) {
      aiResponse[chave] = normalizarParaString(val);
    }

    const camposEsperados: string[] = (modo.campos_resposta as any[]).map((c: any) => c.chave);
    const camposFaltando = camposEsperados.filter(c => !aiResponse[c]);

    if (camposFaltando.length > 0) {
      console.error('❌ Resposta incompleta da IA. Campos faltando:', camposFaltando);
      throw new Error(`Resposta da IA incompleta — campos ausentes: ${camposFaltando.join(', ')}`);
    }

    console.log('✅ Resposta validada. Campos presentes:', camposEsperados.join(', '));

    // ── Consumir crédito após resposta válida ─────────────────────
    console.log('💳 Consumindo 1 crédito Jarvis...');
    const { data: newJarvisCredits, error: creditError } = await supabaseClient
      .rpc('consume_jarvis_credit', { target_user_id: user.id });

    if (creditError) {
      console.error('❌ Erro ao consumir crédito:', creditError);
      if (creditError.message?.includes('insuficientes')) {
        return new Response(
          JSON.stringify({ error: 'Créditos Jarvis insuficientes', creditos_atuais: user.jarvis_creditos || 0 }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw creditError;
    }

    console.log(`✅ Crédito consumido. Novos créditos: ${newJarvisCredits}`);

    // ── Métricas ──────────────────────────────────────────────────
    const palavrasMelhoradas = aiResponse['versao_melhorada']
      ? aiResponse['versao_melhorada'].split(/\s+/).length
      : null;
    const expansaoExcessiva = palavrasMelhoradas != null
      ? palavrasMelhoradas > palavras * 1.5
      : false;

    const tokensInput  = openaiData.usage?.prompt_tokens     || 0;
    const tokensOutput = openaiData.usage?.completion_tokens || 0;
    const tokensTotal  = openaiData.usage?.total_tokens      || 0;
    const custoEstimado = (tokensInput * 0.00015 / 1000) + (tokensOutput * 0.00060 / 1000);

    // ── Salvar interação ──────────────────────────────────────────
    const { error: saveError } = await supabaseClient
      .from('jarvis_interactions')
      .insert({
        user_id:            user.id,
        modo_id:            modo.id,
        texto_original:     texto,
        palavras_original:  palavras,
        resposta_json:      aiResponse,
        // Campos específicos do modo "analisar" para retrocompatibilidade
        diagnostico:        aiResponse['diagnostico']        ?? null,
        explicacao:         aiResponse['explicacao']         ?? null,
        sugestao_reescrita: aiResponse['sugestao_reescrita'] ?? null,
        versao_melhorada:   aiResponse['versao_melhorada']   ?? null,
        palavras_melhorada: palavrasMelhoradas,
        config_version_id:  config.id,
        model_used:         config.model,
        temperatura:        config.temperatura,
        tokens_input:       tokensInput,
        tokens_output:      tokensOutput,
        tokens_total:       tokensTotal,
        tempo_resposta_ms:  responseTime,
        custo_estimado:     custoEstimado,
        expansao_excessiva: expansaoExcessiva,
        possivel_problema:  expansaoExcessiva,
        creditos_consumidos: 1
      });

    if (saveError) {
      console.error('⚠️ Erro ao salvar interação (não bloqueia resposta):', saveError);
    } else {
      console.log('💾 Interação salva com sucesso');
    }

    // ── Resposta ──────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        jarvis_creditos_restantes: newJarvisCredits,
        resposta: aiResponse,
        modo: {
          id:              modo.id,
          nome:            modo.nome,
          label:           modo.label,
          campos_resposta: modo.campos_resposta,
        },
        metadados: {
          palavras_original:  palavras,
          palavras_melhorada: palavrasMelhoradas,
          tempo_resposta_ms:  responseTime,
          modelo:             config.model,
          tokens_usados:      tokensTotal,
          custo_estimado_usd: custoEstimado
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro na função jarvis-assistant:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
