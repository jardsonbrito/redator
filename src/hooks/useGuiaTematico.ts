import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ==================== TIPOS ====================

export interface ItemDescrito {
  titulo: string;
  descricao: string;
}

export interface GuiaTematico {
  id: string;
  frase_tematica: string;
  cover_source: string | null;
  cover_url: string | null;
  cover_file_path: string | null;
  comando_tema: string;
  nucleo_tematico: string;
  contexto: string;
  perguntas_norteadoras: string[];
  interpretacao: string;
  vocabulario: ItemDescrito[];
  problematica_central: string;
  problematicas_associadas: ItemDescrito[];
  propostas_solucao: ItemDescrito[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface NovoGuiaInput {
  frase_tematica: string;
  cover_source?: string | null;
  cover_url?: string | null;
  cover_file_path?: string | null;
  comando_tema: string;
  nucleo_tematico: string;
  contexto: string;
  perguntas_norteadoras: string[];
  interpretacao: string;
  vocabulario: ItemDescrito[];
  problematica_central: string;
  problematicas_associadas: ItemDescrito[];
  propostas_solucao: ItemDescrito[];
}

// ==================== HOOK PRINCIPAL ====================

export function useGuiaTematico() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para alunos — apenas ativos
  const { data: guias = [], isLoading } = useQuery({
    queryKey: ['guias-tematicos-ativos'],
    queryFn: async (): Promise<GuiaTematico[]> => {
      const { data, error } = await (supabase as any)
        .from('guias_tematicos')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as GuiaTematico[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Query para admin — todos
  const { data: todosGuias = [], isLoading: isLoadingAdmin } = useQuery({
    queryKey: ['guias-tematicos-todos'],
    queryFn: async (): Promise<GuiaTematico[]> => {
      const { data, error } = await (supabase as any)
        .from('guias_tematicos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as GuiaTematico[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Mutation: criar
  const { mutateAsync: criarGuia, isPending: isCriando } = useMutation({
    mutationFn: async (input: NovoGuiaInput) => {
      const { data, error } = await (supabase as any)
        .from('guias_tematicos')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data as GuiaTematico;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guias-tematicos-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['guias-tematicos-todos'] });
      toast({ title: 'Guia criado com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar guia', description: err.message, variant: 'destructive' });
    },
  });

  // Mutation: editar
  const { mutateAsync: editarGuia, isPending: isEditando } = useMutation({
    mutationFn: async ({ id, ...input }: NovoGuiaInput & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('guias_tematicos')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as GuiaTematico;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guias-tematicos-ativos'] });
      queryClient.invalidateQueries({ queryKey: ['guias-tematicos-todos'] });
      queryClient.invalidateQueries({ queryKey: ['guia-tematico', data.id] });
      toast({ title: 'Guia atualizado com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar guia', description: err.message, variant: 'destructive' });
    },
  });

  // Mutation: excluir
  const excluirGuia = useCallback(async (id: string) => {
    const { error } = await (supabase as any)
      .from('guias_tematicos')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir guia', description: error.message, variant: 'destructive' });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['guias-tematicos-ativos'] });
    queryClient.invalidateQueries({ queryKey: ['guias-tematicos-todos'] });
    toast({ title: 'Guia excluído.' });
  }, [queryClient, toast]);

  // Mutation: toggle ativo
  const toggleAtivo = useCallback(async (id: string, novoValor: boolean) => {
    const { error } = await (supabase as any)
      .from('guias_tematicos')
      .update({ ativo: novoValor })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao alterar status', description: error.message, variant: 'destructive' });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['guias-tematicos-ativos'] });
    queryClient.invalidateQueries({ queryKey: ['guias-tematicos-todos'] });
    toast({ title: novoValor ? 'Guia ativado.' : 'Guia desativado.' });
  }, [queryClient, toast]);

  return {
    guias,
    isLoading,
    todosGuias,
    isLoadingAdmin,
    criarGuia,
    editarGuia,
    excluirGuia,
    toggleAtivo,
    isCriando,
    isEditando,
  };
}

// ==================== HOOK DE UM ÚNICO GUIA ====================

export function useGuia(id: string | undefined) {
  return useQuery({
    queryKey: ['guia-tematico', id],
    queryFn: async (): Promise<GuiaTematico> => {
      const { data, error } = await (supabase as any)
        .from('guias_tematicos')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as GuiaTematico;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}
