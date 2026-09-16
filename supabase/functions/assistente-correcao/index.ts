import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é o Assistente de Correção do Laboratório do Redator.

Sua função é auxiliar corretores humanos de redação ENEM a formular comentários pedagógicos claros, úteis e tecnicamente corretos.

Você NÃO deve:
- corrigir a redação inteira;
- atribuir notas;
- substituir o corretor humano.

Você deve:
- responder dúvidas do corretor;
- explicar problemas linguísticos;
- sugerir comentários pedagógicos;
- sugerir reformulações;
- ajudar a diferenciar competências;
- melhorar explicações para o aluno.

Regras:
1. Responda sempre em português do Brasil.
2. Seja pedagógico e objetivo.
3. Não seja prolixo.
4. Quando possível, explique por que algo está inadequado.
5. Quando útil, sugira um comentário pronto para o aluno.
6. Considere a lógica das competências do ENEM:
   - C1: gramática, sintaxe, ortografia, pontuação, concordância, regência.
   - C2: tema, repertório, tese, estrutura dissertativa.
   - C3: argumentação, aprofundamento, projeto de texto.
   - C4: coesão, conectivos, progressão textual.
   - C5: proposta de intervenção.
   - PA: ponto de atenção pedagógico.
7. Responda como um assistente de apoio ao corretor, não diretamente ao aluno.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { competencia, comentarioAtual, pergunta } = await req.json();

    if (!pergunta || typeof pergunta !== 'string' || !pergunta.trim()) {
      return new Response(
        JSON.stringify({ error: 'Pergunta é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: config } = await supabaseClient
      .from('laboratorio_ia_config')
      .select('provider, model, temperatura, max_tokens')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const provider = config?.provider ?? 'openai';
    const model = config?.model ?? 'gpt-4o-mini';
    const temperatura = config?.temperatura ?? 0.7;
    const maxTokens = Math.max(config?.max_tokens ?? 800, 800);

    const userPrompt = `Competência selecionada: ${competencia || 'Não informada'}

Comentário atual do corretor:
${(comentarioAtual || '').trim() || 'Ainda vazio'}

Pergunta do corretor:
${pergunta.trim()}`;

    let resposta = '';

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
            { role: 'user', content: userPrompt },
          ],
          temperature: temperatura,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI: ${err.error?.message ?? 'Erro desconhecido'}`);
      }

      const data = await response.json();
      resposta = data.choices?.[0]?.message?.content?.trim() ?? '';

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
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Anthropic: ${err.error?.message ?? 'Erro desconhecido'}`);
      }

      const data = await response.json();
      resposta = data.content?.[0]?.text?.trim() ?? '';

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
            contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: temperatura, maxOutputTokens: maxTokens },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Gemini: ${err.error?.message ?? 'Erro desconhecido'}`);
      }

      const data = await response.json();
      resposta = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    } else {
      throw new Error(`Provider desconhecido: ${provider}`);
    }

    if (!resposta) throw new Error('Resposta vazia do modelo');

    return new Response(
      JSON.stringify({ resposta }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('❌ Erro no assistente de correção:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
