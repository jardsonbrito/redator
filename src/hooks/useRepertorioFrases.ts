import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EixoTematico } from '@/utils/eixoTematicoCores';

// Tipos
export interface RepertorioFrase {
  id: string;
  autor_id: string;
  autor_nome: string;
  autor_turma: string | null;
  frase: string;
  eixo_tematico: EixoTematico;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RepertorioFraseCurtida {
  id: string;
  frase_id: string;
  usuario_id: string;
  created_at: string;
}

export interface NovaFraseInput {
  autor_id: string;
  autor_nome: string;
  autor_turma?: string | null;
  frase: string;
  eixo_tematico: EixoTematico;
}

export interface CurtidasResumo {
  total: number;
  usuarioCurtiu: boolean;
}

export const useRepertorioFrases = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ==================== QUERIES ====================

  // Buscar todas as frases ativas
  const { data: frases = [], isLoading: isLoadingFrases, refetch: refetchFrases } = useQuery({
    queryKey: ['repertorio-frases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repertorio_frases')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar frases:', error);
        throw error;
      }

      return data as RepertorioFrase[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  // Buscar todas as curtidas
  const { data: todasCurtidas = [], refetch: refetchCurtidas } = useQuery({
    queryKey: ['repertorio-frases-curtidas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repertorio_frases_curtidas')
        .select('*');

      if (error) {
        console.error('Erro ao buscar curtidas:', error);
        throw error;
      }

      return data as RepertorioFraseCurtida[];
    },
    staleTime: 1000 * 60 * 1, // 1 minuto
  });

  // ==================== HELPERS ====================

  // Obter curtidas de uma frase específica
  const getCurtidasFrase = useCallback((fraseId: string): RepertorioFraseCurtida[] => {
    return todasCurtidas.filter(c => c.frase_id === fraseId);
  }, [todasCurtidas]);

  // Verificar se usuário curtiu uma frase
  const usuarioCurtiu = useCallback((fraseId: string, usuarioId: string): boolean => {
    return todasCurtidas.some(c => c.frase_id === fraseId && c.usuario_id === usuarioId);
  }, [todasCurtidas]);

  // Obter resumo de curtidas de uma frase
  const getCurtidasResumo = useCallback((fraseId: string, usuarioId?: string): CurtidasResumo => {
    const curtidas = getCurtidasFrase(fraseId);
    return {
      total: curtidas.length,
      usuarioCurtiu: usuarioId ? usuarioCurtiu(fraseId, usuarioId) : false,
    };
  }, [getCurtidasFrase, usuarioCurtiu]);

  // ==================== MUTATIONS ====================

  // Criar nova frase
  const criarFraseMutation = useMutation({
    mutationFn: async (input: NovaFraseInput) => {
      const { data, error } = await supabase
        .from('repertorio_frases')
        .insert({
          autor_id: input.autor_id,
          autor_nome: input.autor_nome,
          autor_turma: input.autor_turma || null,
          frase: input.frase,
          eixo_tematico: input.eixo_tematico,
          ativo: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-frases'] });
      toast({
        title: "Frase publicada",
        description: "Sua frase foi compartilhada com sucesso!",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar frase:', error);
      toast({
        title: "Erro",
        description: "Não foi possível publicar a frase.",
        variant: "destructive",
      });
    },
  });

  // Editar frase
  const editarFraseMutation = useMutation({
    mutationFn: async ({ id, frase, eixo_tematico }: {
      id: string;
      frase: string;
      eixo_tematico: EixoTematico;
    }) => {
      const { data, error } = await supabase
        .from('repertorio_frases')
        .update({ frase, eixo_tematico })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-frases'] });
      toast({
        title: "Frase atualizada",
        description: "Sua frase foi editada com sucesso!",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao editar frase:', error);
      toast({
        title: "Erro",
        description: "Não foi possível editar a frase.",
        variant: "destructive",
      });
    },
  });

  // Excluir frase (soft delete - ativo = false)
  const excluirFraseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('repertorio_frases')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-frases'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-frases-curtidas'] });
      toast({
        title: "Frase excluída",
        description: "A frase foi removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir frase:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a frase.",
        variant: "destructive",
      });
    },
  });

  // Toggle curtida (adicionar ou remover)
  const toggleCurtidaMutation = useMutation({
    mutationFn: async ({ frase_id, usuario_id }: { frase_id: string; usuario_id: string }) => {
      // Verificar se já curtiu
      const { data: curtidaExistente } = await supabase
        .from('repertorio_frases_curtidas')
        .select('id')
        .eq('frase_id', frase_id)
        .eq('usuario_id', usuario_id)
        .maybeSingle();

      if (curtidaExistente) {
        // Remover curtida
        const { error } = await supabase
          .from('repertorio_frases_curtidas')
          .delete()
          .eq('id', curtidaExistente.id);

        if (error) throw error;
        return { action: 'removed' as const };
      }

      // Adicionar curtida
      const { data, error } = await supabase
        .from('repertorio_frases_curtidas')
        .insert({ frase_id, usuario_id })
        .select()
        .single();

      if (error) throw error;
      return { action: 'added' as const, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-frases-curtidas'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao curtir:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar sua curtida.",
        variant: "destructive",
      });
    },
  });

  // ==================== FUNÇÕES WRAPPER ====================

  const criarFrase = useCallback(async (input: NovaFraseInput) => {
    return criarFraseMutation.mutateAsync(input);
  }, [criarFraseMutation]);

  const editarFrase = useCallback(async (
    id: string,
    frase: string,
    eixo_tematico: EixoTematico
  ) => {
    return editarFraseMutation.mutateAsync({ id, frase, eixo_tematico });
  }, [editarFraseMutation]);

  const excluirFrase = useCallback(async (id: string) => {
    return excluirFraseMutation.mutateAsync(id);
  }, [excluirFraseMutation]);

  const toggleCurtida = useCallback(async (frase_id: string, usuario_id: string) => {
    return toggleCurtidaMutation.mutateAsync({ frase_id, usuario_id });
  }, [toggleCurtidaMutation]);

  return {
    // Dados
    frases,
    todasCurtidas,

    // Estado
    isLoading: isLoadingFrases,
    isLoadingFrases,

    // Helpers
    getCurtidasFrase,
    getCurtidasResumo,
    usuarioCurtiu,

    // Ações
    criarFrase,
    editarFrase,
    excluirFrase,
    toggleCurtida,

    // Refetch
    refetchFrases,
    refetchCurtidas,

    // Estados de mutação
    isCriando: criarFraseMutation.isPending,
    isEditando: editarFraseMutation.isPending,
    isExcluindo: excluirFraseMutation.isPending,
    isCurtindo: toggleCurtidaMutation.isPending,
  };
};
