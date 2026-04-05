import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from './useStudentAuth';
import { useSubscription } from './useSubscription';

export interface MicroItem {
  id: string;
  topico_id: string;
  titulo: string;
  descricao_curta: string | null;
  tipo: 'video' | 'audio' | 'podcast' | 'microtexto' | 'infografico' | 'card' | 'quiz' | 'flashcard';
  status: 'ativo' | 'inativo';
  ordem: number;
  planos_permitidos: string[];
  conteudo_url: string | null;
  conteudo_storage_path: string | null;
  conteudo_texto: string | null;
  nota_maxima: number | null;
  created_at: string;
  updated_at: string;
}

// Hook para o aluno — filtra por plano
export const useMicroItens = (topicoId: string) => {
  const { studentData } = useStudentAuth();
  const { data: subscription } = useSubscription(studentData.email);
  const plano = subscription?.plano;

  return useQuery({
    queryKey: ['micro-itens', topicoId, plano],
    queryFn: async () => {
      const query = supabase
        .from('micro_itens')
        .select('*')
        .eq('topico_id', topicoId)
        .eq('status', 'ativo')
        .order('ordem', { ascending: true });

      const { data, error } = plano
        ? await query.contains('planos_permitidos', [plano])
        : await query;

      if (error) throw error;
      return (data ?? []) as MicroItem[];
    },
    enabled: !!topicoId,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook para um item específico (aluno)
export const useMicroItem = (itemId: string) => {
  return useQuery({
    queryKey: ['micro-item', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('micro_itens')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;
      return data as MicroItem;
    },
    enabled: !!itemId,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook admin — sem filtro de plano
export const useMicroItensAdmin = (topicoId: string) => {
  return useQuery({
    queryKey: ['micro-itens-admin', topicoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('micro_itens')
        .select('*')
        .eq('topico_id', topicoId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return (data ?? []) as MicroItem[];
    },
    enabled: !!topicoId,
    staleTime: 30 * 1000,
  });
};

// Hook para questões do quiz de um item
export const useMicroQuizQuestoes = (itemId: string) => {
  return useQuery({
    queryKey: ['micro-quiz-questoes', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('micro_quiz_questoes')
        .select(`
          *,
          micro_quiz_alternativas (*)
        `)
        .eq('item_id', itemId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!itemId,
    staleTime: 5 * 60 * 1000,
  });
};
