import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EixoTematico } from '@/utils/eixoTematicoCores';

// Tipos de obra disponíveis
export const TIPOS_OBRA = [
  'Livro',
  'Filme',
  'Série',
  'Documentário',
  'Peça teatral',
  'Música',
  'Podcast',
  'Outro',
] as const;

export type TipoObra = typeof TIPOS_OBRA[number];

// Tipos
export interface RepertorioObra {
  id: string;
  autor_id: string;
  autor_nome: string;
  autor_turma: string | null;
  tipo_obra: TipoObra;
  titulo: string;
  criador: string;
  sinopse: string;
  eixo_tematico: EixoTematico;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RepertorioObraCurtida {
  id: string;
  obra_id: string;
  usuario_id: string;
  created_at: string;
}

export interface RepertorioObraComentario {
  id: string;
  obra_id: string;
  autor_id: string;
  autor_nome: string;
  comentario: string;
  created_at: string;
  updated_at: string;
}

export interface NovaObraInput {
  autor_id: string;
  autor_nome: string;
  autor_turma?: string | null;
  tipo_obra: TipoObra;
  titulo: string;
  criador: string;
  sinopse: string;
  eixo_tematico: EixoTematico;
}

export interface CurtidasObraResumo {
  total: number;
  usuarioCurtiu: boolean;
}

// Labels para o criador baseado no tipo de obra
export const getCreatorLabel = (tipo: TipoObra): string => {
  switch (tipo) {
    case 'Livro':
      return 'Autor(a)';
    case 'Filme':
    case 'Documentário':
      return 'Diretor(a)';
    case 'Série':
      return 'Criador(a) / Showrunner';
    case 'Peça teatral':
      return 'Dramaturgo(a) / Diretor(a)';
    case 'Música':
      return 'Artista / Compositor(a)';
    case 'Podcast':
      return 'Apresentador(a) / Criador(a)';
    default:
      return 'Autor(a) / Criador(a)';
  }
};

export const useRepertorioObras = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ==================== QUERIES ====================

  // Buscar todas as obras ativas
  const { data: obras = [], isLoading: isLoadingObras, refetch: refetchObras } = useQuery({
    queryKey: ['repertorio-obras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repertorio_obras')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar obras:', error);
        throw error;
      }

      return data as RepertorioObra[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  // Buscar todas as curtidas
  const { data: todasCurtidas = [], refetch: refetchCurtidas } = useQuery({
    queryKey: ['repertorio-obras-curtidas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repertorio_obras_curtidas')
        .select('*');

      if (error) {
        console.error('Erro ao buscar curtidas:', error);
        throw error;
      }

      return data as RepertorioObraCurtida[];
    },
    staleTime: 1000 * 60 * 1, // 1 minuto
  });

  // Buscar todos os comentários
  const { data: todosComentarios = [], refetch: refetchComentarios } = useQuery({
    queryKey: ['repertorio-obras-comentarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repertorio_obras_comentarios')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar comentários:', error);
        throw error;
      }

      return data as RepertorioObraComentario[];
    },
    staleTime: 1000 * 60 * 1, // 1 minuto
  });

  // ==================== HELPERS ====================

  // Obter curtidas de uma obra específica
  const getCurtidasObra = useCallback((obraId: string): RepertorioObraCurtida[] => {
    return todasCurtidas.filter(c => c.obra_id === obraId);
  }, [todasCurtidas]);

  // Verificar se usuário curtiu uma obra
  const usuarioCurtiu = useCallback((obraId: string, usuarioId: string): boolean => {
    return todasCurtidas.some(c => c.obra_id === obraId && c.usuario_id === usuarioId);
  }, [todasCurtidas]);

  // Obter resumo de curtidas de uma obra
  const getCurtidasResumo = useCallback((obraId: string, usuarioId?: string): CurtidasObraResumo => {
    const curtidas = getCurtidasObra(obraId);
    return {
      total: curtidas.length,
      usuarioCurtiu: usuarioId ? usuarioCurtiu(obraId, usuarioId) : false,
    };
  }, [getCurtidasObra, usuarioCurtiu]);

  // Obter comentários de uma obra
  const getComentariosObra = useCallback((obraId: string): RepertorioObraComentario[] => {
    return todosComentarios.filter(c => c.obra_id === obraId);
  }, [todosComentarios]);

  // ==================== MUTATIONS ====================

  // Criar nova obra
  const criarObraMutation = useMutation({
    mutationFn: async (input: NovaObraInput) => {
      const { data, error } = await supabase
        .from('repertorio_obras')
        .insert({
          autor_id: input.autor_id,
          autor_nome: input.autor_nome,
          autor_turma: input.autor_turma || null,
          tipo_obra: input.tipo_obra,
          titulo: input.titulo,
          criador: input.criador,
          sinopse: input.sinopse,
          eixo_tematico: input.eixo_tematico,
          ativo: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-obras'] });
      toast({
        title: "Obra publicada",
        description: "Sua obra foi compartilhada com sucesso!",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar obra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível publicar a obra.",
        variant: "destructive",
      });
    },
  });

  // Editar obra
  const editarObraMutation = useMutation({
    mutationFn: async ({ id, tipo_obra, titulo, criador, sinopse, eixo_tematico }: {
      id: string;
      tipo_obra: TipoObra;
      titulo: string;
      criador: string;
      sinopse: string;
      eixo_tematico: EixoTematico;
    }) => {
      const { data, error } = await supabase
        .from('repertorio_obras')
        .update({ tipo_obra, titulo, criador, sinopse, eixo_tematico })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-obras'] });
      toast({
        title: "Obra atualizada",
        description: "Sua obra foi editada com sucesso!",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao editar obra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível editar a obra.",
        variant: "destructive",
      });
    },
  });

  // Excluir obra (delete real)
  const excluirObraMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('repertorio_obras')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-obras'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-obras-curtidas'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-obras-comentarios'] });
      toast({
        title: "Obra excluída",
        description: "A obra foi removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir obra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a obra.",
        variant: "destructive",
      });
    },
  });

  // Toggle curtida (adicionar ou remover)
  const toggleCurtidaMutation = useMutation({
    mutationFn: async ({ obra_id, usuario_id }: { obra_id: string; usuario_id: string }) => {
      // Verificar se já curtiu
      const { data: curtidaExistente } = await supabase
        .from('repertorio_obras_curtidas')
        .select('id')
        .eq('obra_id', obra_id)
        .eq('usuario_id', usuario_id)
        .maybeSingle();

      if (curtidaExistente) {
        // Remover curtida
        const { error } = await supabase
          .from('repertorio_obras_curtidas')
          .delete()
          .eq('id', curtidaExistente.id);

        if (error) throw error;
        return { action: 'removed' as const };
      }

      // Adicionar curtida
      const { data, error } = await supabase
        .from('repertorio_obras_curtidas')
        .insert({ obra_id, usuario_id })
        .select()
        .single();

      if (error) throw error;
      return { action: 'added' as const, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-obras-curtidas'] });
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

  // Adicionar comentário
  const adicionarComentarioMutation = useMutation({
    mutationFn: async ({ obra_id, autor_id, autor_nome, comentario }: {
      obra_id: string;
      autor_id: string;
      autor_nome: string;
      comentario: string;
    }) => {
      const { data, error } = await supabase
        .from('repertorio_obras_comentarios')
        .insert({ obra_id, autor_id, autor_nome, comentario })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-obras-comentarios'] });
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi publicado!",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao comentar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível publicar o comentário.",
        variant: "destructive",
      });
    },
  });

  // Editar comentário
  const editarComentarioMutation = useMutation({
    mutationFn: async ({ id, comentario }: { id: string; comentario: string }) => {
      const { data, error } = await supabase
        .from('repertorio_obras_comentarios')
        .update({ comentario, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-obras-comentarios'] });
      toast({
        title: "Comentário editado",
        description: "Seu comentário foi atualizado!",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao editar comentário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível editar o comentário.",
        variant: "destructive",
      });
    },
  });

  // Excluir comentário
  const excluirComentarioMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('repertorio_obras_comentarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-obras-comentarios'] });
      toast({
        title: "Comentário excluído",
        description: "O comentário foi removido.",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir comentário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comentário.",
        variant: "destructive",
      });
    },
  });

  // ==================== FUNÇÕES WRAPPER ====================

  const criarObra = useCallback(async (input: NovaObraInput) => {
    return criarObraMutation.mutateAsync(input);
  }, [criarObraMutation]);

  const editarObra = useCallback(async (
    id: string,
    tipo_obra: TipoObra,
    titulo: string,
    criador: string,
    sinopse: string,
    eixo_tematico: EixoTematico
  ) => {
    return editarObraMutation.mutateAsync({ id, tipo_obra, titulo, criador, sinopse, eixo_tematico });
  }, [editarObraMutation]);

  const excluirObra = useCallback(async (id: string) => {
    return excluirObraMutation.mutateAsync(id);
  }, [excluirObraMutation]);

  const toggleCurtida = useCallback(async (obra_id: string, usuario_id: string) => {
    return toggleCurtidaMutation.mutateAsync({ obra_id, usuario_id });
  }, [toggleCurtidaMutation]);

  const adicionarComentario = useCallback(async (
    obra_id: string,
    autor_id: string,
    autor_nome: string,
    comentario: string
  ) => {
    return adicionarComentarioMutation.mutateAsync({ obra_id, autor_id, autor_nome, comentario });
  }, [adicionarComentarioMutation]);

  const editarComentario = useCallback(async (id: string, comentario: string) => {
    return editarComentarioMutation.mutateAsync({ id, comentario });
  }, [editarComentarioMutation]);

  const excluirComentario = useCallback(async (id: string) => {
    return excluirComentarioMutation.mutateAsync(id);
  }, [excluirComentarioMutation]);

  return {
    // Dados
    obras,
    todasCurtidas,
    todosComentarios,

    // Estado
    isLoading: isLoadingObras,
    isLoadingObras,

    // Helpers
    getCurtidasObra,
    getCurtidasResumo,
    usuarioCurtiu,
    getComentariosObra,

    // Ações
    criarObra,
    editarObra,
    excluirObra,
    toggleCurtida,
    adicionarComentario,
    editarComentario,
    excluirComentario,

    // Refetch
    refetchObras,
    refetchCurtidas,
    refetchComentarios,

    // Estados de mutação
    isCriando: criarObraMutation.isPending,
    isEditando: editarObraMutation.isPending,
    isExcluindo: excluirObraMutation.isPending,
    isCurtindo: toggleCurtidaMutation.isPending,
    isComentando: adicionarComentarioMutation.isPending,
  };
};
