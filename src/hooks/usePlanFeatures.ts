import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';

// ─── FASE 4: remover estas constantes após validação em produção ───────────────

// Fallback para visitante (usado se o banco não responder)
const VISITANTE_FEATURES: Record<string, boolean> = {
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
  'minhas_conquistas': false,
  'repertorio_orientado': false,
  'jarvis': true
};

// Fallback por plano (usado se o banco não responder)
const DEFAULT_PLAN_FEATURES: Record<string, Record<string, boolean>> = {
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
    'minhas_conquistas': true,
    'repertorio_orientado': false,
    'jarvis': true,
    'microaprendizagem': true
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
    'minhas_conquistas': true,
    'repertorio_orientado': true,
    'jarvis': true,
    'microaprendizagem': true
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
    'minhas_conquistas': true,
    'repertorio_orientado': true,
    'jarvis': true,
    'microaprendizagem': true
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
    'minhas_conquistas': true,
    'repertorio_orientado': false,
    'jarvis': true,
    'microaprendizagem': true
  }
};

// ─── fim das constantes de fallback ───────────────────────────────────────────

export const usePlanFeatures = (userEmail: string) => {
  const { data: subscription } = useSubscription(userEmail);

  // Verifica se é visitante
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
    staleTime: 5 * 60 * 1000
  });

  // ── FASE 2: DB-first — features do plano ─────────────────────────────────
  // Ativo quando: tem plano e não é visitante.
  // retry:1 → fallback rápido se o banco não responder.
  // Retorna null se o banco falhar → isFeatureEnabled cai no hardcoded.
  const { data: dbPlanFeatures } = useQuery({
    queryKey: ['db-plan-features', subscription?.plano],
    queryFn: async (): Promise<Record<string, boolean> | null> => {
      if (!subscription?.plano) return null;
      const { data, error } = await supabase
        .rpc('get_features_for_plan', { plan_name: subscription.plano });
      if (error || !data || data.length === 0) return null;
      return Object.fromEntries(
        (data as { chave: string; habilitado: boolean }[]).map(r => [r.chave, r.habilitado])
      );
    },
    enabled: !!subscription?.plano && isVisitante !== true,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // ── FASE 2: DB-first — features do visitante ──────────────────────────────
  // Ativo somente quando confirmado como visitante.
  // get_visitante_features() não recebe parâmetro; cache global (sem email na key).
  const { data: dbVisitanteFeatures } = useQuery({
    queryKey: ['db-visitante-features'],
    queryFn: async (): Promise<Record<string, boolean> | null> => {
      const { data, error } = await supabase.rpc('get_visitante_features');
      if (error || !data || data.length === 0) return null;
      return Object.fromEntries(
        (data as { chave: string; habilitado: boolean }[]).map(r => [r.chave, r.habilitado])
      );
    },
    enabled: isVisitante === true,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });
  // ─────────────────────────────────────────────────────────────────────────

  // Overrides individuais por aluno (inalterado)
  const { data: overrides = [] } = useQuery({
    queryKey: ['student-plan-overrides', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .eq('user_type', 'aluno')
        .single();

      if (profileError || !profile) return [];

      let { data, error } = await supabase
        .rpc('get_student_plan_overrides', { student_uuid: profile.id });

      if (error && (error.code === '42883' || error.message?.includes('does not exist'))) {
        const { data: directData, error: directError } = await supabase
          .from('plan_overrides')
          .select('*')
          .eq('student_id', profile.id);
        if (directError) return [];
        data = directData;
        error = null;
      } else if (error) {
        return [];
      }

      return data || [];
    },
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000
  });

  // ── isFeatureEnabled: lógica de acesso com DB-first + fallback ────────────
  //
  // Prioridade de resolução:
  //   1. sempre_disponivel  → acesso livre, sem checar plano
  //      (gerenciado em MenuGrid; exposto via alwaysAvailableKeys na Fase 4)
  //   2. Visitante          → DB visitante_funcionalidades → fallback VISITANTE_FEATURES
  //   3. Sem assinatura     → false para tudo
  //   4. Override individual → plan_overrides (prioridade máxima, inalterada)
  //   5. Plano              → DB plano_funcionalidades → fallback DEFAULT_PLAN_FEATURES
  //
  const isFeatureEnabled = (functionality: string): boolean => {
    // Cenário: VISITANTE
    if (isVisitante) {
      return dbVisitanteFeatures
        ? (dbVisitanteFeatures[functionality] ?? false)
        : (VISITANTE_FEATURES[functionality] ?? false);
    }

    // Cenário: SEM ASSINATURA (inclui aluno sem plano ou plano vencido)
    if (!subscription?.plano) {
      return false;
    }

    // Cenário: OVERRIDE INDIVIDUAL (prioridade máxima sobre tudo)
    const override = overrides.find(o => o.functionality === functionality);
    if (override !== undefined) {
      return override.enabled;
    }

    // Cenário: PLANO (Largada / Lapidação / Bolsista / Liderança)
    return dbPlanFeatures
      ? (dbPlanFeatures[functionality] ?? false)
      : (DEFAULT_PLAN_FEATURES[subscription.plano]?.[functionality] ?? false);
  };

  // planFeatures: usado externamente (ex: CustomizePlanSimple) — DB-first
  const planFeatures = subscription?.plano
    ? (dbPlanFeatures ?? DEFAULT_PLAN_FEATURES[subscription.plano] ?? null)
    : null;

  return {
    subscription,
    isFeatureEnabled,
    planFeatures,
    overrides,
    isLoading: !subscription,
    isVisitante,
    // usingDbFeatures: true quando banco respondeu com sucesso (útil para debug/admin)
    usingDbFeatures: !!(dbPlanFeatures || dbVisitanteFeatures),
    debugInfo: {
      userEmail: userEmail ? userEmail.slice(0, 10) + '...' : '',
      hasSubscription: !!subscription,
      plano: subscription?.plano,
      overridesCount: overrides.length,
      isVisitante,
      dbSource: !!(dbPlanFeatures || dbVisitanteFeatures)
    }
  };
};