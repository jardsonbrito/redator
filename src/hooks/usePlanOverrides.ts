import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlanOverride {
  id: string;
  student_id: string;
  functionality: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface UsePlanOverridesProps {
  studentId?: string;
  plano?: string | null;
}

export const usePlanOverrides = ({ studentId, plano }: UsePlanOverridesProps) => {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Features base do plano (fonte de verdade: banco)
  const { data: dbPlanFeatures } = useQuery({
    queryKey: ['db-plan-features', plano],
    queryFn: async (): Promise<Record<string, boolean> | null> => {
      if (!plano) return null;
      const { data, error } = await supabase
        .rpc('get_features_for_plan', { plan_name: plano });
      if (error || !data || data.length === 0) return null;
      return Object.fromEntries(
        (data as { chave: string; habilitado: boolean }[]).map(r => [r.chave, r.habilitado])
      );
    },
    enabled: !!plano,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Buscar overrides do aluno
  const loadOverrides = async () => {
    if (!studentId) return;

    setLoading(true);
    try {
      let { data, error } = await supabase
        .rpc('get_student_plan_overrides', { student_uuid: studentId });

      if (error && error.code === '42883') {
        const { data: directData, error: directError } = await supabase
          .from('plan_overrides')
          .select('*')
          .eq('student_id', studentId);

        if (directError) {
          return;
        }
        data = directData;
        error = null;
      } else if (error) {
        return;
      }

      const organized: Record<string, boolean> = {};
      data?.forEach((override: any) => {
        organized[override.functionality] = override.enabled;
      });
      setOverrides(organized);
    } catch (error) {
      console.error('Erro ao carregar overrides:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verifica se uma funcionalidade está habilitada:
  // override individual tem prioridade; senão usa a feature base do plano no banco.
  const isFunctionalityEnabled = (functionality: string): boolean => {
    if (!plano) return false;

    if (overrides[functionality] !== undefined) {
      return overrides[functionality];
    }

    return dbPlanFeatures?.[functionality] ?? false;
  };

  // Atualizar override de uma funcionalidade
  const updateFunctionalityOverride = async (functionality: string, enabled: boolean) => {
    if (!studentId) {
      toast({
        title: "Erro",
        description: "ID do aluno não fornecido",
        variant: "destructive"
      });
      return false;
    }

    try {
      let { error } = await supabase
        .rpc('upsert_student_plan_override', {
          student_uuid: studentId,
          functionality_name: functionality,
          is_enabled: enabled
        });

      if (error && error.code === '42883') {
        const { error: upsertError } = await supabase
          .from('plan_overrides')
          .upsert({
            student_id: studentId,
            functionality: functionality,
            enabled: enabled
          }, {
            onConflict: 'student_id,functionality'
          });

        error = upsertError;
      }

      if (error) {
        toast({
          title: "❌ Erro ao Salvar",
          description: `Erro ao salvar configuração: ${error.message}`,
          variant: "destructive"
        });
        return false;
      }

      setOverrides(prev => ({ ...prev, [functionality]: enabled }));
      return true;
    } catch (error) {
      toast({
        title: "❌ Erro ao Salvar",
        description: "Erro inesperado ao salvar configuração.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Resetar todos os overrides do aluno
  const resetAllOverrides = async () => {
    if (!studentId) {
      toast({
        title: "Erro",
        description: "ID do aluno não fornecido",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .rpc('reset_student_plan_overrides', { student_uuid: studentId });

      if (error) {
        toast({
          title: "❌ Erro ao Resetar",
          description: `Erro ao resetar configurações: ${error.message}`,
          variant: "destructive"
        });
        return false;
      }

      setOverrides({});
      toast({
        title: "✅ Resetado",
        description: "Configurações resetadas com sucesso!",
      });

      return true;
    } catch (error) {
      toast({
        title: "❌ Erro ao Resetar",
        description: "Erro inesperado ao resetar configurações.",
        variant: "destructive"
      });
      return false;
    }
  };

  const hasCustomizations = () => Object.keys(overrides).length > 0;

  useEffect(() => {
    if (studentId) {
      loadOverrides();
    }
  }, [studentId]);

  return {
    overrides,
    loading,
    isFunctionalityEnabled,
    updateFunctionalityOverride,
    resetAllOverrides,
    hasCustomizations,
    refetch: loadOverrides
  };
};
