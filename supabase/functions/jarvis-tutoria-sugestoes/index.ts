import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SugestoesRequest {
  userEmail: string;
  sessaoId: string;
  dadosPreenchidos: Record<string, string>;
  camposVazios: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🎓 Jarvis Tutoria - Sugestões - Iniciando');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { userEmail, sessaoId, dadosPreenchidos, camposVazios }: SugestoesRequest = await req.json();

    if (!userEmail || !sessaoId || !camposVazios || camposVazios.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: userEmail, sessaoId, camposVazios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Email:', userEmail);
    console.log('🆔 Sessão:', sessaoId);
    console.log('📝 Campos vazios:', camposVazios.join(', '));

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

    const promptSugestoes = modo.config_interativa.prompts?.sugestoes;
    if (!promptSugestoes) {
      throw new Error('Prompt de sugestões não configurado para este modo');
    }

    // ── Chamar OpenAI para sugestões ───────────────────────────────
    console.log('🤖 Gerando sugestões para campos vazios...');
    const startTime = Date.now();

    const contextoCampos = Object.entries(dadosPreenchidos)
      .map(([campo, valor]) => `${campo}: ${valor}`)
      .join('\n');

    const userPrompt = `Campos já preenchidos pelo aluno:
${contextoCampos}

Campos que preciso que você sugira conteúdo:
${camposVazios.join(', ')}

Retorne JSON com APENAS os campos vazios que listei acima.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: promptSugestoes },
          { role: 'user', content: userPrompt }
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

    const content = openaiData.choices[0].message.content;
    const sugestoes: Record<string, string> = JSON.parse(content);

    console.log(`✅ Sugestões geradas em ${responseTime}ms`);
    console.log('📊 Sugestões:', Object.keys(sugestoes).join(', '));

    // ── Salvar interação ───────────────────────────────────────────
    const { error: saveError } = await supabaseClient
      .from('jarvis_interactions')
      .insert({
        user_id: user.id,
        modo_id: modo.id,
        subtab_nome: sessao.subtab_nome,
        etapa: 'sugestoes',
        sessao_id: sessao.id,
        texto_original: JSON.stringify(dadosPreenchidos),
        resposta_json: sugestoes,
        palavras_original: 0,  // não aplicável
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
        dados_sugeridos: sugestoes,
        etapa_atual: 'sugestoes',
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
        sugestoes,
        campos_sugeridos: Object.keys(sugestoes),
        tempo_resposta_ms: responseTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro na função jarvis-tutoria-sugestoes:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
