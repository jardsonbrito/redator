import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar se é admin
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Não autenticado');
    }

    // Verificar se é admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', user.email)
      .eq('ativo', true)
      .single();

    if (!adminUser) {
      throw new Error('Acesso negado - apenas administradores');
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    // Buscar informações de billing da OpenAI
    const billingResponse = await fetch('https://api.openai.com/v1/dashboard/billing/subscription', {
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
    });

    if (!billingResponse.ok) {
      throw new Error(`Erro ao buscar billing: ${billingResponse.statusText}`);
    }

    const billingData = await billingResponse.json();

    // Buscar uso atual do mês
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usageResponse = await fetch(
      `https://api.openai.com/v1/dashboard/billing/usage?start_date=${firstDay.toISOString().split('T')[0]}&end_date=${lastDay.toISOString().split('T')[0]}`,
      {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
      }
    );

    if (!usageResponse.ok) {
      throw new Error(`Erro ao buscar usage: ${usageResponse.statusText}`);
    }

    const usageData = await usageResponse.json();

    return new Response(
      JSON.stringify({
        subscription: billingData,
        usage: usageData,
        periodo: {
          inicio: firstDay.toISOString().split('T')[0],
          fim: lastDay.toISOString().split('T')[0],
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
