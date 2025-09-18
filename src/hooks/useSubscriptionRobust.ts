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
        // 1. Verificar se a tabela assinaturas existe
        const tableExists = await checkAssinaturasTableExists();

        if (!tableExists) {
          console.warn('⚠️ Tabela assinaturas não existe. Tentando criar...');
          await createAssinaturasTableIfNeeded();

          // Fallback: retornar sem assinatura se a tabela não existir
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('creditos')
            .eq('email', userEmail)
            .single();

          return {
            plano: null,
            data_inscricao: null,
            data_validade: null,
            status: 'Sem Assinatura',
            dias_restantes: 0,
            creditos: profile?.creditos || 0
          };
        }

        // 2. Buscar dados do perfil do usuário (incluindo créditos)
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

        // 3. Buscar assinatura ativa
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
        console.error('Erro geral ao buscar dados de assinatura:', error);

        // Fallback: tentar buscar pelo menos os créditos do perfil
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('creditos')
            .eq('email', userEmail)
            .single();

          return {
            plano: null,
            data_inscricao: null,
            data_validade: null,
            status: 'Sem Assinatura',
            dias_restantes: 0,
            creditos: profile?.creditos || 0
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
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!userEmail,
    retry: 3, // Tentar 3 vezes em caso de erro
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) // Backoff exponencial
  });
};