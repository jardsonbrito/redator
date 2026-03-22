import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JarvisRequest {
  texto: string;
  userEmail: string;
}

interface JarvisResponse {
  diagnostico: string;
  explicacao: string;
  sugestao_reescrita: string;
  versao_melhorada: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🤖 Jarvis Assistant - Iniciando processamento');

    // 1. Setup Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 2. Verificar OpenAI API Key
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    // 3. Parse request
    const { texto, userEmail }: JarvisRequest = await req.json();
    console.log('📧 Email:', userEmail);
    console.log('📝 Texto:', texto.substring(0, 100) + '...');

    if (!texto || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'Texto e email são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Buscar usuário
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

    console.log('👤 Usuário:', user.nome, '| Créditos Jarvis:', user.jarvis_creditos);

    // 5. Buscar configuração ativa
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

    console.log('⚙️ Config:', config.model, '| Versão:', config.versao);

    // 6. Validar limite de palavras
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

    // 7. Verificar rate limit
    const { data: canProceed } = await supabaseClient
      .rpc('check_jarvis_rate_limit', {
        p_user_id: user.id,
        p_limite_hora: config.limite_consultas_hora
      });

    if (!canProceed) {
      console.warn('⏱️ Rate limit atingido');
      return new Response(
        JSON.stringify({
          error: `Limite de ${config.limite_consultas_hora} consultas por hora atingido`,
          limite_hora: config.limite_consultas_hora
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Consumir crédito JARVIS ANTES de chamar IA
    console.log('💳 Consumindo 1 crédito Jarvis...');

    const { data: newJarvisCredits, error: creditError } = await supabaseClient
      .rpc('consume_jarvis_credit', { target_user_id: user.id });

    if (creditError) {
      console.error('❌ Erro ao consumir crédito:', creditError);

      // Verificar se é erro de créditos insuficientes
      if (creditError.message?.includes('insuficientes')) {
        return new Response(
          JSON.stringify({
            error: 'Créditos Jarvis insuficientes',
            creditos_atuais: user.jarvis_creditos || 0
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw creditError;
    }

    console.log(`✅ Crédito consumido. Novos créditos: ${newJarvisCredits}`);

    // 9. Chamar OpenAI API
    console.log('🤖 Chamando OpenAI...');
    const startTime = Date.now();

    const messages: OpenAIMessage[] = [
      { role: 'system', content: config.system_prompt },
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
        messages: messages,
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

    // 10. Parsear e validar resposta
    const content = openaiData.choices[0].message.content;
    const aiResponse: JarvisResponse = JSON.parse(content);

    if (!aiResponse.diagnostico || !aiResponse.explicacao ||
        !aiResponse.sugestao_reescrita || !aiResponse.versao_melhorada) {
      console.error('❌ Resposta incompleta da IA:', aiResponse);
      throw new Error('Resposta da IA incompleta - faltam campos obrigatórios');
    }

    console.log('✅ Resposta validada com sucesso');

    // 11. Calcular métricas
    const palavrasMelhoradas = aiResponse.versao_melhorada.split(/\s+/).length;
    const expansaoExcessiva = palavrasMelhoradas > palavras * 1.5;
    const tokensInput = openaiData.usage?.prompt_tokens || 0;
    const tokensOutput = openaiData.usage?.completion_tokens || 0;
    const tokensTotal = openaiData.usage?.total_tokens || 0;

    // Custo estimado (gpt-4o-mini: $0.00015 input, $0.00060 output)
    const custoEstimado = (tokensInput * 0.00015 / 1000) + (tokensOutput * 0.00060 / 1000);

    console.log('📊 Métricas:', {
      palavrasOriginais: palavras,
      palavrasMelhoradas,
      expansaoExcessiva,
      tokens: tokensTotal,
      custo: `$${custoEstimado.toFixed(6)}`
    });

    // 12. Salvar interação
    const { error: saveError } = await supabaseClient
      .from('jarvis_interactions')
      .insert({
        user_id: user.id,
        texto_original: texto,
        palavras_original: palavras,
        diagnostico: aiResponse.diagnostico,
        explicacao: aiResponse.explicacao,
        sugestao_reescrita: aiResponse.sugestao_reescrita,
        versao_melhorada: aiResponse.versao_melhorada,
        palavras_melhorada: palavrasMelhoradas,
        config_version_id: config.id,
        model_used: config.model,
        temperatura: config.temperatura,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        tokens_total: tokensTotal,
        tempo_resposta_ms: responseTime,
        custo_estimado: custoEstimado,
        expansao_excessiva: expansaoExcessiva,
        possivel_problema: expansaoExcessiva,
        creditos_consumidos: 1
      });

    if (saveError) {
      console.error('⚠️ Erro ao salvar interação:', saveError);
      // Não falha a requisição por isso
    } else {
      console.log('💾 Interação salva com sucesso');
    }

    // 13. Retornar resposta estruturada
    return new Response(
      JSON.stringify({
        success: true,
        jarvis_creditos_restantes: newJarvisCredits,
        resposta: aiResponse,
        metadados: {
          palavras_original: palavras,
          palavras_melhorada: palavrasMelhoradas,
          tempo_resposta_ms: responseTime,
          modelo: config.model,
          tokens_usados: tokensTotal,
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
