import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from './useStudentAuth';

export type ProgressoStatus = 'nao_iniciado' | 'em_andamento' | 'concluido';

export interface MicroProgresso {
  id: string;
  email_aluno: string;
  item_id: string;
  status: ProgressoStatus;
  iniciado_em: string | null;
  concluido_em: string | null;
  updated_at: string;
}

// Busca o progresso de todos os itens de um tópico para o aluno logado
export const useMicroProgresso = (itemIds: string[]) => {
  const { studentData } = useStudentAuth();
  const email = studentData.email?.toLowerCase().trim();

  return useQuery({
    queryKey: ['micro-progresso', email, itemIds],
    queryFn: async () => {
      if (!email || !itemIds.length) return [];

      const { data, error } = await supabase
        .from('micro_progresso')
        .select('*')
        .eq('email_aluno', email)
        .in('item_id', itemIds);

      if (error) throw error;
      return (data ?? []) as MicroProgresso[];
    },
    enabled: !!email && itemIds.length > 0,
    staleTime: 60 * 1000,
  });
};

// Busca o progresso de um item específico
export const useMicroProgressoItem = (itemId: string) => {
  const { studentData } = useStudentAuth();
  const email = studentData.email?.toLowerCase().trim();

  return useQuery({
    queryKey: ['micro-progresso-item', email, itemId],
    queryFn: async () => {
      if (!email || !itemId) return null;

      const { data, error } = await supabase
        .from('micro_progresso')
        .select('*')
        .eq('email_aluno', email)
        .eq('item_id', itemId)
        .maybeSingle();

      if (error) throw error;
      return data as MicroProgresso | null;
    },
    enabled: !!email && !!itemId,
    staleTime: 60 * 1000,
  });
};

// Mutation para atualizar progresso (upsert)
export const useMicroProgressoMutation = () => {
  const { studentData } = useStudentAuth();
  const queryClient = useQueryClient();
  const email = studentData.email?.toLowerCase().trim();

  const marcarEmAndamento = useMutation({
    mutationFn: async (itemId: string) => {
      if (!email) return;

      const { error } = await supabase
        .from('micro_progresso')
        .upsert(
          {
            email_aluno: email,
            item_id: itemId,
            status: 'em_andamento',
            iniciado_em: new Date().toISOString(),
          },
          {
            onConflict: 'email_aluno,item_id',
            ignoreDuplicates: false,
          }
        );

      if (error) throw error;

      // Registrar evento analytics
      await supabase.from('micro_analytics').insert({
        email_aluno: email,
        item_id: itemId,
        evento: 'em_andamento',
      });
    },
    onSuccess: (_, itemId) => {
      queryClient.invalidateQueries({ queryKey: ['micro-progresso-item', email, itemId] });
      queryClient.invalidateQueries({ queryKey: ['micro-progresso', email] });
    },
  });

  const marcarConcluido = useMutation({
    mutationFn: async (itemId: string) => {
      if (!email) return;

      const agora = new Date().toISOString();

      const { error } = await supabase
        .from('micro_progresso')
        .upsert(
          {
            email_aluno: email,
            item_id: itemId,
            status: 'concluido',
            iniciado_em: agora,
            concluido_em: agora,
          },
          {
            onConflict: 'email_aluno,item_id',
            ignoreDuplicates: false,
          }
        );

      if (error) throw error;

      // Registrar evento analytics
      await supabase.from('micro_analytics').insert({
        email_aluno: email,
        item_id: itemId,
        evento: 'conclusao',
      });
    },
    onSuccess: (_, itemId) => {
      queryClient.invalidateQueries({ queryKey: ['micro-progresso-item', email, itemId] });
      queryClient.invalidateQueries({ queryKey: ['micro-progresso', email] });
      queryClient.invalidateQueries({ queryKey: ['micro-topicos'] });
    },
  });

  const registrarAcesso = async (itemId: string) => {
    if (!email) return;
    await supabase.from('micro_analytics').insert({
      email_aluno: email,
      item_id: itemId,
      evento: 'acesso',
    });
  };

  return { marcarEmAndamento, marcarConcluido, registrarAcesso };
};
