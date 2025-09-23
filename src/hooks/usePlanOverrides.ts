import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

type PlanType = 'Liderança' | 'Lapidação' | 'Largada' | 'Bolsista';

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
  plano?: PlanType | null;
}

export const usePlanOverrides = ({ studentId, plano }: UsePlanOverridesProps) => {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Buscar overrides do aluno (usando service_role para contornar RLS)
  const loadOverrides = async () => {
    if (!studentId) return;

    setLoading(true);
    try {
      // Usar rpc ou consulta direta para contornar RLS já que alunos não usam Supabase Auth
      let { data, error } = await supabase
        .rpc('get_student_plan_overrides', {
          student_uuid: studentId
        });

      // Se a função RPC não existir, tentar buscar diretamente da tabela
      if (error && error.code === '42883') {
        console.log('⚠️ Função RPC não encontrada, tentando acesso direto à tabela...');
        const { data: directData, error: directError } = await supabase
          .from('plan_overrides')
          .select('*')
          .eq('student_id', studentId);

        if (directError) {
          console.error('❌ Erro ao buscar overrides direto:', directError);
          return;
        }

        data = directData;
        error = null;
      } else if (error) {
        console.error('Erro ao carregar overrides:', error);
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

  // Verificar se uma funcionalidade está habilitada
  const isFunctionalityEnabled = (functionality: string): boolean => {
    if (!plano) return false;

    // Usar override se existir, caso contrário usar o padrão do plano
    if (overrides[functionality] !== undefined) {
      return overrides[functionality];
    }

    return DEFAULT_PLAN_FEATURES[plano]?.[functionality] || false;
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
      // Usar RPC para garantir que a operação funcione independente do RLS
      let { error } = await supabase
        .rpc('upsert_student_plan_override', {
          student_uuid: studentId,
          functionality_name: functionality,
          is_enabled: enabled
        });

      // Se a função RPC não existir, fazer upsert direto na tabela
      if (error && error.code === '42883') {
        console.log('⚠️ Função RPC upsert não encontrada, tentando upsert direto...');
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
        console.error('Erro ao salvar override:', error);
        toast({
          title: "❌ Erro ao Salvar",
          description: `Erro ao salvar configuração: ${error.message}`,
          variant: "destructive"
        });
        return false;
      }

      // Atualizar estado local
      setOverrides(prev => ({
        ...prev,
        [functionality]: enabled
      }));

      return true;
    } catch (error) {
      console.error('Erro ao salvar override:', error);
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
      // Usar RPC para resetar todos os overrides
      const { error } = await supabase
        .rpc('reset_student_plan_overrides', {
          student_uuid: studentId
        });

      if (error) {
        console.error('Erro ao resetar overrides:', error);
        toast({
          title: "❌ Erro ao Resetar",
          description: `Erro ao resetar configurações: ${error.message}`,
          variant: "destructive"
        });
        return false;
      }

      // Limpar estado local
      setOverrides({});
      toast({
        title: "✅ Resetado",
        description: "Configurações resetadas com sucesso!",
      });

      return true;
    } catch (error) {
      console.error('Erro ao resetar overrides:', error);
      toast({
        title: "❌ Erro ao Resetar",
        description: "Erro inesperado ao resetar configurações.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Verificar se há customizações ativas
  const hasCustomizations = () => {
    return Object.keys(overrides).length > 0;
  };

  // Carregar overrides quando studentId mudar
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