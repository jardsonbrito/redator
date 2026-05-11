import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um assistente pedagógico especializado em comentários de correção de redação. Reescreva o comentário abaixo em 2 ou 3 versões mais claras, naturais e objetivas, sem acrescentar informações novas e sem mudar o sentido original. O comentário deve manter tom pedagógico, respeitoso e direto, adequado para um aluno. Retorne apenas as sugestões no formato JSON com a chave "sugestoes" contendo um array de strings.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { comentario } = await req.json();

    if (!comentario || typeof comentario !== 'string' || !comentario.trim()) {
      return new Response(
        JSON.stringify({ error: 'Comentário é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Buscar configuração de IA do laboratório (provider + modelo configurável pelo admin)
    const { data: config } = await supabaseClient
      .from('laboratorio_ia_config')
      .select('provider, model, temperatura, max_tokens')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const provider = config?.provider ?? 'openai';
    const model = config?.model ?? 'gpt-4o-mini';
    const temperatura = config?.temperatura ?? 0.7;
    const maxTokens = config?.max_tokens ?? 600;

    let sugestoes: string[] = [];

    if (provider === 'openai') {
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Comentário original:\n\n${comentario.trim()}` },
          ],
          temperature: temperatura,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI: ${err.error?.message ?? 'Erro desconhecido'}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      sugestoes = Array.isArray(parsed.sugestoes) ? parsed.sugestoes : [];

    } else if (provider === 'anthropic') {
      const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
      if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurada');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: `Comentário original:\n\n${comentario.trim()}` },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Anthropic: ${err.error?.message ?? 'Erro desconhecido'}`);
      }

      const data = await response.json();
      const raw = data.content?.[0]?.text ?? '{}';
      // Extrai JSON do texto (pode vir com markdown)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      sugestoes = Array.isArray(parsed.sugestoes) ? parsed.sugestoes : [];

    } else if (provider === 'gemini') {
      const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada');

      const geminiModel = model || 'gemini-2.0-flash';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${SYSTEM_PROMPT}\n\nComentário original:\n\n${comentario.trim()}` },
                ],
              },
            ],
            generationConfig: {
              temperature: temperatura,
              maxOutputTokens: maxTokens,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Gemini: ${err.error?.message ?? 'Erro desconhecido'}`);
      }

      const data = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const parsed = JSON.parse(raw);
      sugestoes = Array.isArray(parsed.sugestoes) ? parsed.sugestoes : [];
    } else {
      throw new Error(`Provider desconhecido: ${provider}`);
    }

    // Garantir no máximo 3 sugestões não vazias
    sugestoes = sugestoes.filter(s => typeof s === 'string' && s.trim()).slice(0, 3);

    return new Response(
      JSON.stringify({ sugestoes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('❌ Erro ao refinar comentário:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
