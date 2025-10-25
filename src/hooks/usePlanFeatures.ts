import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';

type PlanType = 'Liderança' | 'Lapidação' | 'Largada' | 'Bolsista';

// Definir funcionalidades para visitantes (acesso muito limitado)
const VISITANTE_FEATURES = {
  'temas': true,
  'enviar_tema_livre': true,
  'exercicios': false,
  'simulados': false,
  'lousa': false,
  'biblioteca': false,
  'redacoes_exemplares': false,
  'aulas_ao_vivo': false,
  'videoteca': false,
  'aulas_gravadas': false,
  'diario_online': false,
  'gamificacao': false,
  'top_5': false,
  'minhas_conquistas': false
};

// Definir funcionalidades padrão por plano
const DEFAULT_PLAN_FEATURES = {
  'Largada': {
    'temas': true,
    'enviar_tema_livre': false,
    'exercicios': false,
    'simulados': false,
    'lousa': false,
    'biblioteca': false,
    'redacoes_exemplares': false,
    'aulas_ao_vivo': false,
    'videoteca': true,
    'aulas_gravadas': true,
    'diario_online': true,
    'gamificacao': true,
    'top_5': true,
    'minhas_conquistas': true
  },
  'Lapidação': {
    'temas': true,
    'enviar_tema_livre': true,
    'exercicios': true,
    'simulados': true,
    'lousa': true,
    'biblioteca': true,
    'redacoes_exemplares': true,
    'aulas_ao_vivo': false,
    'videoteca': true,
    'aulas_gravadas': true,
    'diario_online': true,
    'gamificacao': true,
    'top_5': true,
    'minhas_conquistas': true
  },
  'Liderança': {
    'temas': true,
    'enviar_tema_livre': true,
    'exercicios': true,
    'simulados': true,
    'lousa': true,
    'biblioteca': true,
    'redacoes_exemplares': true,
    'aulas_ao_vivo': true,
    'videoteca': true,
    'aulas_gravadas': true,
    'diario_online': true,
    'gamificacao': true,
    'top_5': true,
    'minhas_conquistas': true
  },
  'Bolsista': {
    'temas': true,
    'enviar_tema_livre': true,
    'exercicios': true,
    'simulados': true,
    'lousa': true,
    'biblioteca': true,
    'redacoes_exemplares': true,
    'aulas_ao_vivo': false,
    'videoteca': true,
    'aulas_gravadas': true,
    'diario_online': true,
    'gamificacao': true,
    'top_5': true,
    'minhas_conquistas': true
  }
};

export const usePlanFeatures = (userEmail: string) => {
  const { data: subscription } = useSubscription(userEmail);

  // Verificar se é visitante
  const { data: isVisitante } = useQuery({
    queryKey: ['is-visitante', userEmail],
    queryFn: async () => {
      if (!userEmail) return false;

      const { data } = await supabase
        .from('visitante_sessoes')
        .select('id')
        .eq('email_visitante', userEmail)
        .single();

      return !!data;
    },
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  // Buscar overrides do aluno usando RPC
  const { data: overrides = [] } = useQuery({
    queryKey: ['student-plan-overrides', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];

      // Primeiro buscar o ID do aluno
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .eq('user_type', 'aluno')
        .single();

      if (profileError || !profile) return [];

      // Buscar overrides usando RPC para contornar RLS

      let { data, error } = await supabase
        .rpc('get_student_plan_overrides', {
          student_uuid: profile.id
        });

      // Se a função RPC não existir, tentar buscar diretamente da tabela
      if (error && (error.code === '42883' || error.message?.includes('does not exist'))) {
        const { data: directData, error: directError } = await supabase
          .from('plan_overrides')
          .select('*')
          .eq('student_id', profile.id);

        if (directError) {
          // Se a tabela não existir, retornar array vazio em vez de falhar
          if (directError.code === '42P01' || directError.message?.includes('does not exist')) {
            return [];
          }
          return [];
        }

        data = directData;
        error = null;
      } else if (error) {
        return [];
      }

      return data || [];
    },
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  const isFeatureEnabled = (functionality: string): boolean => {
    // Visitantes têm acesso limitado (apenas Temas e Enviar Redação)
    if (isVisitante) {
      return VISITANTE_FEATURES[functionality] ?? false;
    }

    if (!subscription?.plano) {
      return false;
    }

    // Verificar se há override
    const override = overrides.find(o => o.functionality === functionality);
    if (override) {
      return override.enabled;
    }

    // Usar padrão do plano
    const defaultValue = DEFAULT_PLAN_FEATURES[subscription.plano]?.[functionality] ?? false;
    return defaultValue;
  };

  return {
    subscription,
    isFeatureEnabled,
    planFeatures: subscription?.plano ? DEFAULT_PLAN_FEATURES[subscription.plano] : null,
    overrides,
    // Debug info
    isLoading: !subscription,
    isVisitante,
    debugInfo: {
      userEmail: userEmail.slice(0, 10) + '...',
      hasSubscription: !!subscription,
      plano: subscription?.plano,
      overridesCount: overrides.length,
      isVisitante
    }
  };
};