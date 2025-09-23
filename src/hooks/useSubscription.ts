import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isDateActiveOrFuture, getDaysUntilExpiration } from '@/utils/dateUtils';

interface SubscriptionInfo {
  plano: 'Liderança' | 'Lapidação' | 'Largada' | 'Bolsista' | null;
  data_inscricao: string | null;
  data_validade: string | null;
  status: 'Ativo' | 'Vencido' | 'Sem Assinatura';
  dias_restantes: number;
  creditos: number;
}

export const useSubscription = (userEmail: string) => {
  return useQuery({
    queryKey: ['student-subscription', userEmail],
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
        // Buscar dados do perfil do usuário (incluindo créditos)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, creditos')
          .eq('email', userEmail)
          .single();

        if (profileError || !profile) {
          console.error('Erro ao buscar perfil:', profileError);
          return {
            plano: null,
            data_inscricao: null,
            data_validade: null,
            status: 'Sem Assinatura',
            dias_restantes: 0,
            creditos: 0
          };
        }

        // Buscar assinatura ativa
        const { data: assinatura, error: assinaturaError } = await supabase
          .from('assinaturas')
          .select('plano, data_inscricao, data_validade')
          .eq('aluno_id', profile.id)
          .order('data_validade', { ascending: false })
          .limit(1)
          .single();

        const creditos = profile.creditos || 0;

        // Se não tem assinatura
        if (assinaturaError || !assinatura) {
          return {
            plano: null,
            data_inscricao: null,
            data_validade: null,
            status: 'Sem Assinatura',
            dias_restantes: 0,
            creditos
          };
        }

        // Calcular status e dias restantes usando funções seguras
        const diasRestantes = getDaysUntilExpiration(assinatura.data_validade);
        const status: 'Ativo' | 'Vencido' = isDateActiveOrFuture(assinatura.data_validade) ? 'Ativo' : 'Vencido';

        return {
          plano: assinatura.plano,
          data_inscricao: assinatura.data_inscricao,
          data_validade: assinatura.data_validade,
          status,
          dias_restantes: Math.max(0, diasRestantes),
          creditos
        };

      } catch (error) {
        console.error('Erro ao buscar dados de assinatura:', error);
        return {
          plano: null,
          data_inscricao: null,
          data_validade: null,
          status: 'Sem Assinatura',
          dias_restantes: 0,
          creditos: 0
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!userEmail
  });
};