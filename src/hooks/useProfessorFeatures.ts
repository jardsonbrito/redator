import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProfessorFeatures = () => {
  // Buscar funcionalidades ordenadas para professores
  const { data: funcionalidadesOrdenadas, isLoading, error } = useQuery({
    queryKey: ['funcionalidades-professor-ordered'],
    queryFn: async () => {
      console.log('🔍 Buscando funcionalidades de professor...');

      const { data, error } = await supabase
        .from('funcionalidades')
        .select('chave, nome_exibicao, ordem_professor, habilitado_professor, descricao, ativo')
        .eq('ativo', true)
        .eq('habilitado_professor', true)
        .order('ordem_professor');

      if (error) {
        console.error('❌ Erro ao buscar funcionalidades de professor:', error);
        console.error('Detalhes do erro:', error);
        return [];
      }

      console.log('✅ Funcionalidades encontradas:', data?.length || 0);
      console.table(data);
      return data || [];
    },
    staleTime: 0,
    retry: 1,
  });

  console.log('📊 useProfessorFeatures:', {
    isLoading,
    error,
    count: funcionalidadesOrdenadas?.length || 0,
    data: funcionalidadesOrdenadas,
  });

  return {
    funcionalidadesOrdenadas: funcionalidadesOrdenadas || [],
    isLoading,
  };
};
