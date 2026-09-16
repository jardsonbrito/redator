import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from './useStudentAuth';
import { useSubscription } from './useSubscription';

export interface MicroTopico {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  cover_storage_path: string | null;
  total_itens: number;
  total_concluidos: number;
  created_at: string;
  updated_at: string;
}

// Hook para o aluno — filtra por plano e conta itens visíveis
export const useMicroTopicos = () => {
  const { studentData } = useStudentAuth();
  const { data: subscription } = useSubscription(studentData.email);
  const plano = subscription?.plano;

  return useQuery({
    queryKey: ['micro-topicos', plano, studentData.email],
    queryFn: async () => {
      const { data: topicos, error } = await supabase
        .from('micro_topicos')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      if (!topicos?.length) return [];

      // Para cada tópico, contar itens visíveis para o plano do aluno
      const topicosComItens = await Promise.all(
        topicos.map(async (topico) => {
          const query = supabase
            .from('micro_itens')
            .select('*', { count: 'exact', head: true })
            .eq('topico_id', topico.id)
            .eq('status', 'ativo');

          // Filtrar por plano se disponível
          const { count } = plano
            ? await query.contains('planos_permitidos', [plano])
            : await query;

          // Buscar progresso do aluno neste tópico
          let concluidos = 0;
          if (studentData.email && count && count > 0) {
            // Buscar IDs dos itens visíveis
            const itensQuery = supabase
              .from('micro_itens')
              .select('id')
              .eq('topico_id', topico.id)
              .eq('status', 'ativo');

            const { data: itens } = plano
              ? await itensQuery.contains('planos_permitidos', [plano])
              : await itensQuery;

            if (itens?.length) {
              const { count: countConcluidos } = await supabase
                .from('micro_progresso')
                .select('*', { count: 'exact', head: true })
                .eq('email_aluno', studentData.email.toLowerCase().trim())
                .eq('status', 'concluido')
                .in('item_id', itens.map(i => i.id));

              concluidos = countConcluidos ?? 0;
            }
          }

          return {
            ...topico,
            total_itens: count ?? 0,
            total_concluidos: concluidos,
          };
        })
      );

      // Só retorna tópicos com pelo menos 1 item visível para o plano
      return topicosComItens.filter(t => t.total_itens > 0);
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook admin — sem filtro de plano
export const useMicroTopicosAdmin = () => {
  return useQuery({
    queryKey: ['micro-topicos-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('micro_topicos')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 1000,
  });
};
