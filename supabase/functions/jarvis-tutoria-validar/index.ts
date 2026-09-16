import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidarRequest {
  userEmail: string;
  sessaoId: string;
  dadosCompletos: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🎓 Jarvis Tutoria - Validação - Iniciando');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { userEmail, sessaoId, dadosCompletos }: ValidarRequest = await req.json();

    if (!userEmail || !sessaoId || !dadosCompletos) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: userEmail, sessaoId, dadosCompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Email:', userEmail);
    console.log('🆔 Sessão:', sessaoId);

    // ── Buscar usuário ─────────────────────────────────────────────
    const { data: user, error: userError } = await supabaseClient
      .from('profiles')
      .select('id, nome')
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

    // ── Buscar configuração do modo ────────────────────────────────
    const { data: modo, error: modoError } = await supabaseClient
      .from('jarvis_modos')
      .select('id, nome, config_interativa')
      .eq('id', sessao.modo_id)
      .single();

    if (modoError || !modo || !modo.config_interativa) {
      console.error('❌ Modo não encontrado:', modoError);
      return new Response(
        JSON.stringify({ error: 'Configuração do modo não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const promptValidacao = modo.config_interativa.prompts?.validacao;
    if (!promptValidacao) {
      throw new Error('Prompt de validação não configurado para este modo');
    }

    // ── Chamar OpenAI para validação ───────────────────────────────
    console.log('🤖 Validando insumos pedagogicamente...');
    const startTime = Date.now();

    const userPrompt = `Analise os seguintes elementos:

${Object.entries(dadosCompletos).map(([campo, valor]) => `${campo}: ${valor}`).join('\n')}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: promptValidacao },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
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

    const content = openaiData.choices[0].message.content;
    const validacao = JSON.parse(content);

    console.log(`✅ Validação concluída em ${responseTime}ms`);

    // ── Salvar interação ───────────────────────────────────────────
    const { error: saveError } = await supabaseClient
      .from('jarvis_interactions')
      .insert({
        user_id: user.id,
        modo_id: modo.id,
        subtab_nome: sessao.subtab_nome,
        etapa: 'validacao',
        sessao_id: sessao.id,
        texto_original: JSON.stringify(dadosCompletos),
        resposta_json: validacao,
        palavras_original: 0,
        model_used: 'gpt-4o-mini',
        tempo_resposta_ms: responseTime,
        tokens_input: openaiData.usage?.prompt_tokens || 0,
        tokens_output: openaiData.usage?.completion_tokens || 0,
        tokens_total: openaiData.usage?.total_tokens || 0,
        creditos_consumidos: 0  // não consome créditos nesta etapa
      });

    if (saveError) {
      console.error('⚠️ Erro ao salvar interação:', saveError);
    }

    // ── Atualizar sessão ───────────────────────────────────────────
    const { error: updateError } = await supabaseClient
      .from('jarvis_tutoria_sessoes')
      .update({
        validacao_resultado: validacao,
        etapa_atual: 'validacao',
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
        validacao,
        tempo_resposta_ms: responseTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro na função jarvis-tutoria-validar:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
