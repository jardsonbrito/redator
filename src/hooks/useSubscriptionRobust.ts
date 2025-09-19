import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isDateActiveOrFuture, getDaysUntilExpiration } from '@/utils/dateUtils';

interface SubscriptionInfo {
  plano: 'Liderança' | 'Lapidação' | 'Largada' | null;
  data_inscricao: string | null;
  data_validade: string | null;
  status: 'Ativo' | 'Vencido' | 'Sem Assinatura';
  dias_restantes: number;
  creditos: number;
}

// Função para verificar se a tabela assinaturas existe
const checkAssinaturasTableExists = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('assinaturas')
      .select('count', { count: 'exact' })
      .limit(1);

    return !error;
  } catch (error) {
    console.warn('Tabela assinaturas não existe ainda:', error);
    return false;
  }
};

// Função para criar a tabela assinaturas se não existir
const createAssinaturasTableIfNeeded = async (): Promise<void> => {
  try {
    const { error } = await supabase.rpc('create_assinaturas_table_if_not_exists');
    if (error) {
      console.error('Erro ao criar tabela assinaturas:', error);
    }
  } catch (error) {
    console.warn('Não foi possível criar a tabela automaticamente:', error);
  }
};

export const useSubscriptionRobust = (userEmail: string) => {
  return useQuery({
    queryKey: ['student-subscription-robust', userEmail],
    queryFn: async (): Promise<SubscriptionInfo> => {
      if (!userEmail) {
        return {
          plano: null,
          data_inscricao: null,
          data_validade: null,
          status: 'Sem Assinatura',
          dias_restantes: 0,
          creditos: 0
        };
      }

      try {
        // Buscar assinatura para o email do usuário

        // 1. Tentar usar a função RPC otimizada primeiro
        const { data: subscriptionData, error: rpcError } = await supabase
          .rpc('get_subscription_by_email', { student_email: userEmail });

        if (!rpcError && subscriptionData && subscriptionData.length > 0) {
          const sub = subscriptionData[0];

          return {
            plano: sub.plano as 'Liderança' | 'Lapidação' | 'Largada',
            data_inscricao: sub.data_inscricao,
            data_validade: sub.data_validade,
            status: sub.status as 'Ativo' | 'Vencido',
            dias_restantes: sub.dias_restantes,
            creditos: sub.creditos
          };
        }

        // 2. Fallback: buscar perfil e assinatura separadamente
        const { data: profileData, error: profileRpcError } = await supabase
          .rpc('get_profile_by_email', { user_email: userEmail });

        if (profileRpcError || !profileData || profileData.length === 0) {
          return {
            plano: null,
            data_inscricao: null,
            data_validade: null,
            status: 'Sem Assinatura',
            dias_restantes: 0,
            creditos: 0
          };
        }

        const profile = profileData[0];

        // 3. Buscar assinatura diretamente na tabela
        const { data: assinatura, error: assinaturaError } = await supabase
          .from('assinaturas')
          .select('plano, data_inscricao, data_validade')
          .eq('aluno_id', profile.id)
          .order('data_validade', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Se não tem assinatura
        if (!assinatura) {
          return {
            plano: null,
            data_inscricao: null,
            data_validade: null,
            status: 'Sem Assinatura',
            dias_restantes: 0,
            creditos: profile.creditos
          };
        }

        // Calcular status e dias restantes usando funções seguras
        const diasRestantes = getDaysUntilExpiration(assinatura.data_validade);
        const status: 'Ativo' | 'Vencido' = isDateActiveOrFuture(assinatura.data_validade) ? 'Ativo' : 'Vencido';

        return {
          plano: assinatura.plano as 'Liderança' | 'Lapidação' | 'Largada',
          data_inscricao: assinatura.data_inscricao,
          data_validade: assinatura.data_validade,
          status,
          dias_restantes: Math.max(0, diasRestantes),
          creditos: profile.creditos
        };

      } catch (error) {

        // Fallback final: tentar buscar pelo menos os créditos do perfil
        try {
          const { data: profileData } = await supabase
            .rpc('get_profile_by_email', { user_email: userEmail });

          return {
            plano: null,
            data_inscricao: null,
            data_validade: null,
            status: 'Sem Assinatura',
            dias_restantes: 0,
            creditos: profileData?.[0]?.creditos || 0
          };
        } catch (fallbackError) {
          return {
            plano: null,
            data_inscricao: null,
            data_validade: null,
            status: 'Sem Assinatura',
            dias_restantes: 0,
            creditos: 0
          };
        }
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minuto para facilitar testes
    enabled: !!userEmail,
    retry: (failureCount, error) => {
      // Se a tabela não existe, não tentar novamente
      if (error && error.toString().includes('relation "assinaturas" does not exist')) {
        return false;
      }
      // Máximo de 2 tentativas para outros erros
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
    refetchOnWindowFocus: true, // Recarregar quando a janela ganha foco
    refetchOnMount: true // Sempre recarregar quando o componente monta
  });
};