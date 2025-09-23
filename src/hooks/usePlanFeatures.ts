import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';

type PlanType = 'Liderança' | 'Lapidação' | 'Largada' | 'Bolsista';

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

  // Buscar overrides do aluno
  const { data: overrides = [] } = useQuery({
    queryKey: ['student-plan-overrides', userEmail],
    queryFn: async () => {
      if (!userEmail || !subscription?.plano) return [];

      // Primeiro buscar o ID do aluno
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (profileError || !profile) return [];

      // Buscar overrides
      const { data, error } = await supabase
        .from('plan_overrides')
        .select('functionality, enabled')
        .eq('student_id', profile.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userEmail && !!subscription?.plano,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  const isFeatureEnabled = (functionality: string): boolean => {
    if (!subscription?.plano) return false;

    // Verificar se há override
    const override = overrides.find(o => o.functionality === functionality);
    if (override !== undefined) {
      return override.enabled;
    }

    // Usar padrão do plano
    return DEFAULT_PLAN_FEATURES[subscription.plano]?.[functionality] ?? false;
  };

  return {
    subscription,
    isFeatureEnabled,
    planFeatures: subscription?.plano ? DEFAULT_PLAN_FEATURES[subscription.plano] : null,
    overrides
  };
};