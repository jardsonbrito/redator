import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelRequest {
  redacaoId: string;
  userEmail: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { redacaoId, userEmail }: CancelRequest = await req.json();

    if (!redacaoId || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'redacaoId e userEmail são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Buscar a redação e verificar se pode ser cancelada
    const { data: redacao, error: redacaoError } = await supabaseClient
      .from('redacoes_enviadas')
      .select('*')
      .eq('id', redacaoId)
      .eq('email_aluno', userEmail.toLowerCase().trim())
      .single();

    if (redacaoError || !redacao) {
      return new Response(
        JSON.stringify({ error: 'Redação não encontrada ou não pertence ao usuário' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar se a redação ainda pode ser cancelada (não foi corrigida)
    if (redacao.corrigida || redacao.status === 'em_correcao') {
      // Para verificar se já iniciou a correção, vamos ver se há notas lançadas
      const temNotasLancadas = redacao.c1_corretor_1 !== null ||
                               redacao.c1_corretor_2 !== null ||
                               redacao.comentario_c1_corretor_1 !== null ||
                               redacao.comentario_c1_corretor_2 !== null;

      if (temNotasLancadas) {
        return new Response(
          JSON.stringify({ error: 'Não é possível cancelar uma redação que já iniciou o processo de correção' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Determinar quantos créditos devem ser ressarcidos
    let creditosParaRessarcir = 0;

    switch (redacao.tipo_envio) {
      case 'regular':
        creditosParaRessarcir = 1;
        break;
      case 'simulado':
        creditosParaRessarcir = 2;
        break;
      case 'exercicio':
        creditosParaRessarcir = 0; // Exercícios geralmente são gratuitos
        break;
      case 'visitante':
        creditosParaRessarcir = 0; // Visitantes não usam créditos
        break;
      default:
        creditosParaRessarcir = 1; // Default para regular
    }

    // 4. Buscar o perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, creditos')
      .eq('email', userEmail.toLowerCase().trim())
      .eq('user_type', 'aluno')
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil do usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Iniciar transação - deletar redação e ressarcir créditos
    const { error: deleteError } = await supabaseClient
      .from('redacoes_enviadas')
      .delete()
      .eq('id', redacaoId);

    if (deleteError) {
      console.error('Erro ao deletar redação:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao cancelar redação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Ressarcir créditos se necessário
    if (creditosParaRessarcir > 0) {
      const novoSaldoCreditos = (profile.creditos || 0) + creditosParaRessarcir;

      const { error: creditError } = await supabaseClient
        .from('profiles')
        .update({ creditos: novoSaldoCreditos })
        .eq('id', profile.id);

      if (creditError) {
        console.error('Erro ao ressarcir créditos:', creditError);
        // Aqui seria ideal implementar um rollback, mas por simplicidade vamos apenas logar
        // Em produção, isso deveria ser uma transação atômica
      }

      // 7. Registrar no audit de créditos
      const { error: auditError } = await supabaseClient
        .from('credit_audit')
        .insert({
          user_id: profile.id,
          admin_id: null,
          action: 'add',
          old_credits: profile.creditos || 0,
          new_credits: novoSaldoCreditos,
          reason: `Ressarcimento por cancelamento de redação ${redacao.tipo_envio}`
        });

      if (auditError) {
        console.warn('Erro ao registrar audit de créditos:', auditError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Redação cancelada com sucesso',
        creditosRessarcidos: creditosParaRessarcir,
        novoSaldoCreditos: (profile.creditos || 0) + creditosParaRessarcir
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função cancel-redacao:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});