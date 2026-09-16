import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessorAuth } from './useProfessorAuth';
import { useProfessorSubscription } from './useProfessorSubscription';

interface ProfessorFuncionalidade {
  chave: string;
  nome_exibicao: string;
  ordem_professor: number | null;
  habilitado_professor: boolean;
  descricao: string | null;
  ativo: boolean;
}

export const useProfessorFeatures = () => {
  const { professor } = useProfessorAuth();
  const { data: subscription } = useProfessorSubscription(professor?.id);

  // Catálogo de funcionalidades disponíveis para professores, na ordem definida pelo admin
  const { data: catalogo, isLoading } = useQuery({
    queryKey: ['funcionalidades-professor-ordered'],
    queryFn: async (): Promise<ProfessorFuncionalidade[]> => {
      const { data, error } = await supabase
        .from('funcionalidades')
        .select('chave, nome_exibicao, ordem_professor, habilitado_professor, descricao, ativo')
        .eq('ativo', true)
        .not('ordem_professor', 'is', null)
        .order('ordem_professor');

      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Funcionalidades liberadas no plano de professor do usuário (DB-first, mesma RPC dos planos de aluno)
  const { data: planFeatures } = useQuery({
    queryKey: ['db-professor-plan-features', subscription?.plano],
    queryFn: async (): Promise<Record<string, boolean> | null> => {
      if (!subscription?.plano) return null;
      const { data, error } = await supabase
        .rpc('get_features_for_plan', { plan_name: subscription.plano });
      if (error || !data || data.length === 0) return null;
      return Object.fromEntries(
        (data as { chave: string; habilitado: boolean }[]).map(r => [r.chave, r.habilitado])
      );
    },
    enabled: !!subscription?.plano,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Prioridade: plano do professor → toggle global (fallback para professores sem plano configurado)
  // Enquanto a assinatura ainda não carregou, não libera nada (evita "flash" do catálogo global)
  const isFeatureEnabled = (chave: string): boolean => {
    if (subscription === undefined) return false;

    if (subscription.plano) {
      return planFeatures ? (planFeatures[chave] ?? false) : false;
    }

    return catalogo?.find(f => f.chave === chave)?.habilitado_professor ?? false;
  };

  const funcionalidadesOrdenadas = (catalogo ?? []).filter(f => isFeatureEnabled(f.chave));

  return {
    funcionalidadesOrdenadas,
    isFeatureEnabled,
    isLoading: isLoading || subscription === undefined,
  };
};
