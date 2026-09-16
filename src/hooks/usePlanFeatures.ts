import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';

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

  // ── Verifica se é candidato ativo do Processo Seletivo ────────────────────
  const { data: isPSCandidate } = useQuery({
    queryKey: ['is-ps-candidate', userEmail],
    queryFn: async (): Promise<boolean> => {
      if (!userEmail) return false;
      const { data } = await supabase
        .from('ps_candidatos')
        .select('id, ps_formularios!inner(ativo)')
        .ilike('email_aluno', userEmail.toLowerCase().trim())
        .not('status', 'in', '("reprovado","migrado")')
        .eq('ps_formularios.ativo', true)
        .limit(1)
        .maybeSingle();
      return !!data;
    },
    enabled: !!userEmail && isVisitante !== true && !subscription?.plano,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ── Features do Processo Seletivo ─────────────────────────────────────────
  const { data: dbPSFeatures } = useQuery({
    queryKey: ['db-ps-features'],
    queryFn: async (): Promise<Record<string, boolean> | null> => {
      const { data, error } = await supabase.rpc('get_ps_features');
      if (error || !data || data.length === 0) return null;
      return Object.fromEntries(
        (data as { chave: string; habilitado: boolean }[]).map(r => [r.chave, r.habilitado])
      );
    },
    enabled: isPSCandidate === true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ── Ordem dos cards para o MenuGrid ──────────────────────────────────────
  // Carregado uma vez; cache de 5 min; sem retry excessivo.
  const { data: funcionalidadesOrdenadas } = useQuery({
    queryKey: ['funcionalidades-ordered'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funcionalidades')
        .select('chave, ordem_aluno, nome_exibicao')
        .eq('ativo', true)
        .order('ordem_aluno');
      if (error) return null;
      return (data ?? null) as Array<{ chave: string; ordem_aluno: number; nome_exibicao: string }> | null;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
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

  // ── isFeatureEnabled: lógica de acesso DB-first ──────────────────────────
  //
  // Prioridade de resolução:
  //   1. Visitante          → DB visitante_funcionalidades → false
  //   2. PS candidate       → DB ps_funcionalidades → false
  //   3. Sem assinatura     → false para tudo
  //   4. Override individual → plan_overrides (prioridade máxima)
  //   5. Plano              → DB plano_funcionalidades → false
  //
  const isFeatureEnabled = (functionality: string): boolean => {
    if (isVisitante) {
      return dbVisitanteFeatures ? (dbVisitanteFeatures[functionality] ?? false) : false;
    }

    if (isPSCandidate && !subscription?.plano) {
      return dbPSFeatures ? (dbPSFeatures[functionality] ?? false) : false;
    }

    if (!subscription?.plano) {
      return false;
    }

    const override = overrides.find(o => o.functionality === functionality);
    if (override !== undefined) {
      return override.enabled;
    }

    return dbPlanFeatures ? (dbPlanFeatures[functionality] ?? false) : false;
  };

  const planFeatures = subscription?.plano ? (dbPlanFeatures ?? null) : null;

  return {
    subscription,
    isFeatureEnabled,
    planFeatures,
    overrides,
    funcionalidadesOrdenadas,
    isLoading: !subscription,
    isVisitante,
    isPSCandidate,
    usingDbFeatures: !!(dbPlanFeatures || dbVisitanteFeatures || dbPSFeatures),
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