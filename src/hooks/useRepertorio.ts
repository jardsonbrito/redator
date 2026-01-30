import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Tipos
export interface RepertorioPublicacao {
  id: string;
  autor_id: string;
  autor_nome: string;
  autor_turma: string | null;
  frase_tematica: string;
  tipo_paragrafo: 'introducao' | 'desenvolvimento' | 'conclusao';
  paragrafo: string;
  destaque: boolean;
  created_at: string;
  updated_at: string;
  votos?: RepertorioVoto[];
  comentarios?: RepertorioComentario[];
}

export interface RepertorioVoto {
  id: string;
  publicacao_id: string;
  votante_id: string;
  voto: 'produtivo' | 'nao_produtivo';
  created_at: string;
}

export interface RepertorioComentario {
  id: string;
  publicacao_id: string;
  autor_id: string;
  autor_nome: string;
  comentario: string;
  created_at: string;
  updated_at: string;
}

export interface VotosResumo {
  total: number;
  produtivos: number;
  nao_produtivos: number;
  percentual_produtivo: number;
}

export interface NovaPublicacaoInput {
  autor_id: string;
  autor_nome: string;
  autor_turma?: string | null;
  frase_tematica: string;
  tipo_paragrafo: 'introducao' | 'desenvolvimento' | 'conclusao';
  paragrafo: string;
}

// Função helper para calcular resumo de votos
export const calcularVotosResumo = (votos: RepertorioVoto[] = []): VotosResumo => {
  const total = votos.length;
  const produtivos = votos.filter(v => v.voto === 'produtivo').length;
  const nao_produtivos = total - produtivos;
  const percentual_produtivo = total > 0 ? Math.round((produtivos / total) * 100) : 0;

  return { total, produtivos, nao_produtivos, percentual_produtivo };
};

export const useRepertorio = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // ==================== QUERIES ====================

  // Buscar todas as publicações
  const { data: publicacoes = [], isLoading: isLoadingPublicacoes, refetch: refetchPublicacoes } = useQuery({
    queryKey: ['repertorio-publicacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repertorio_publicacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar publicações:', error);
        throw error;
      }

      return data as RepertorioPublicacao[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  // Buscar publicações em destaque
  const { data: destaques = [], isLoading: isLoadingDestaques } = useQuery({
    queryKey: ['repertorio-destaques'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repertorio_publicacoes')
        .select('*')
        .eq('destaque', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar destaques:', error);
        throw error;
      }

      return data as RepertorioPublicacao[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Buscar votos de todas as publicações
  const { data: todosVotos = [], refetch: refetchVotos } = useQuery({
    queryKey: ['repertorio-votos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repertorio_votos')
        .select('*');

      if (error) {
        console.error('Erro ao buscar votos:', error);
        throw error;
      }

      return data as RepertorioVoto[];
    },
    staleTime: 1000 * 60 * 1, // 1 minuto
  });

  // Buscar comentários de todas as publicações
  const { data: todosComentarios = [], refetch: refetchComentarios } = useQuery({
    queryKey: ['repertorio-comentarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repertorio_comentarios')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar comentários:', error);
        throw error;
      }

      return data as RepertorioComentario[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // ==================== HELPERS ====================

  // Obter votos de uma publicação específica
  const getVotosPublicacao = useCallback((publicacaoId: string) => {
    return todosVotos.filter(v => v.publicacao_id === publicacaoId);
  }, [todosVotos]);

  // Obter comentários de uma publicação específica
  const getComentariosPublicacao = useCallback((publicacaoId: string) => {
    return todosComentarios.filter(c => c.publicacao_id === publicacaoId);
  }, [todosComentarios]);

  // Verificar se usuário já votou em uma publicação
  const getVotoUsuario = useCallback((publicacaoId: string, votanteId: string) => {
    return todosVotos.find(v => v.publicacao_id === publicacaoId && v.votante_id === votanteId);
  }, [todosVotos]);

  // ==================== MUTATIONS ====================

  // Criar nova publicação
  const criarPublicacaoMutation = useMutation({
    mutationFn: async (input: NovaPublicacaoInput) => {
      const { data, error } = await supabase
        .from('repertorio_publicacoes')
        .insert({
          autor_id: input.autor_id,
          autor_nome: input.autor_nome,
          autor_turma: input.autor_turma || null,
          frase_tematica: input.frase_tematica,
          tipo_paragrafo: input.tipo_paragrafo,
          paragrafo: input.paragrafo,
          destaque: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-publicacoes'] });
      toast({
        title: "Publicação criada",
        description: "Seu parágrafo foi publicado com sucesso!",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar publicação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a publicação.",
        variant: "destructive",
      });
    },
  });

  // Editar publicação
  const editarPublicacaoMutation = useMutation({
    mutationFn: async ({ id, frase_tematica, tipo_paragrafo, paragrafo }: {
      id: string;
      frase_tematica: string;
      tipo_paragrafo: 'introducao' | 'desenvolvimento' | 'conclusao';
      paragrafo: string
    }) => {
      const { data, error } = await supabase
        .from('repertorio_publicacoes')
        .update({ frase_tematica, tipo_paragrafo, paragrafo })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-publicacoes'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-destaques'] });
      toast({
        title: "Publicação atualizada",
        description: "Sua publicação foi editada com sucesso!",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao editar publicação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível editar a publicação.",
        variant: "destructive",
      });
    },
  });

  // Excluir publicação
  const excluirPublicacaoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('repertorio_publicacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-publicacoes'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-destaques'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-votos'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-comentarios'] });
      toast({
        title: "Publicação excluída",
        description: "A publicação foi removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir publicação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a publicação.",
        variant: "destructive",
      });
    },
  });

  // Destacar/Remover destaque de publicação
  const toggleDestaqueMutation = useMutation({
    mutationFn: async ({ id, destaque }: { id: string; destaque: boolean }) => {
      const { data, error } = await supabase
        .from('repertorio_publicacoes')
        .update({ destaque })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-publicacoes'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-destaques'] });
      toast({
        title: variables.destaque ? "Publicação destacada" : "Destaque removido",
        description: variables.destaque
          ? "A publicação agora aparece nos destaques!"
          : "A publicação não está mais em destaque.",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao alterar destaque:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o destaque.",
        variant: "destructive",
      });
    },
  });

  // Votar em publicação
  const votarMutation = useMutation({
    mutationFn: async ({ publicacao_id, votante_id, voto }: {
      publicacao_id: string;
      votante_id: string;
      voto: 'produtivo' | 'nao_produtivo'
    }) => {
      // Verificar se já existe voto
      const { data: votoExistente } = await supabase
        .from('repertorio_votos')
        .select('id, voto')
        .eq('publicacao_id', publicacao_id)
        .eq('votante_id', votante_id)
        .maybeSingle();

      if (votoExistente) {
        // Se o voto é o mesmo, remover (toggle)
        if (votoExistente.voto === voto) {
          const { error } = await supabase
            .from('repertorio_votos')
            .delete()
            .eq('id', votoExistente.id);

          if (error) throw error;
          return { action: 'removed' };
        }

        // Se é diferente, atualizar
        const { data, error } = await supabase
          .from('repertorio_votos')
          .update({ voto })
          .eq('id', votoExistente.id)
          .select()
          .single();

        if (error) throw error;
        return { action: 'updated', data };
      }

      // Inserir novo voto
      const { data, error } = await supabase
        .from('repertorio_votos')
        .insert({ publicacao_id, votante_id, voto })
        .select()
        .single();

      if (error) throw error;
      return { action: 'created', data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-votos'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao votar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar seu voto.",
        variant: "destructive",
      });
    },
  });

  // Adicionar comentário (professor/admin)
  const adicionarComentarioMutation = useMutation({
    mutationFn: async ({ publicacao_id, autor_id, autor_nome, comentario }: {
      publicacao_id: string;
      autor_id: string;
      autor_nome: string;
      comentario: string;
    }) => {
      const { data, error } = await supabase
        .from('repertorio_comentarios')
        .insert({ publicacao_id, autor_id, autor_nome, comentario })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-comentarios'] });
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi publicado!",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao comentar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
        variant: "destructive",
      });
    },
  });

  // Editar comentário
  const editarComentarioMutation = useMutation({
    mutationFn: async ({ id, comentario }: { id: string; comentario: string }) => {
      const { data, error } = await supabase
        .from('repertorio_comentarios')
        .update({ comentario })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-comentarios'] });
      toast({
        title: "Comentário atualizado",
        description: "Seu comentário foi editado!",
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
        .from('repertorio_comentarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-comentarios'] });
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

  const criarPublicacao = useCallback(async (input: NovaPublicacaoInput) => {
    return criarPublicacaoMutation.mutateAsync(input);
  }, [criarPublicacaoMutation]);

  const editarPublicacao = useCallback(async (
    id: string,
    frase_tematica: string,
    tipo_paragrafo: 'introducao' | 'desenvolvimento' | 'conclusao',
    paragrafo: string
  ) => {
    return editarPublicacaoMutation.mutateAsync({ id, frase_tematica, tipo_paragrafo, paragrafo });
  }, [editarPublicacaoMutation]);

  const excluirPublicacao = useCallback(async (id: string) => {
    return excluirPublicacaoMutation.mutateAsync(id);
  }, [excluirPublicacaoMutation]);

  const toggleDestaque = useCallback(async (id: string, destaque: boolean) => {
    return toggleDestaqueMutation.mutateAsync({ id, destaque });
  }, [toggleDestaqueMutation]);

  const votar = useCallback(async (
    publicacao_id: string,
    votante_id: string,
    voto: 'produtivo' | 'nao_produtivo'
  ) => {
    return votarMutation.mutateAsync({ publicacao_id, votante_id, voto });
  }, [votarMutation]);

  const adicionarComentario = useCallback(async (
    publicacao_id: string,
    autor_id: string,
    autor_nome: string,
    comentario: string
  ) => {
    return adicionarComentarioMutation.mutateAsync({ publicacao_id, autor_id, autor_nome, comentario });
  }, [adicionarComentarioMutation]);

  const editarComentario = useCallback(async (id: string, comentario: string) => {
    return editarComentarioMutation.mutateAsync({ id, comentario });
  }, [editarComentarioMutation]);

  const excluirComentario = useCallback(async (id: string) => {
    return excluirComentarioMutation.mutateAsync(id);
  }, [excluirComentarioMutation]);

  // Buscar perfil do usuário por email para obter UUID
  const buscarPerfilPorEmail = useCallback(async (email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, sobrenome, turma')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
    return data;
  }, []);

  // Criar ou buscar perfil para admin (admins podem não ter perfil na tabela profiles)
  const buscarOuCriarPerfilAdmin = useCallback(async (email: string, nome: string) => {
    // Primeiro, tentar buscar perfil existente
    let perfil = await buscarPerfilPorEmail(email);

    if (perfil) {
      return perfil.id;
    }

    // Se não existe, criar perfil para o admin
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        email: email,
        nome: nome,
        user_type: 'admin',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Erro ao criar perfil admin:', insertError);
      // Se falhou por já existir (race condition), tentar buscar novamente
      const perfilRetry = await buscarPerfilPorEmail(email);
      return perfilRetry?.id || null;
    }

    return newProfile?.id || null;
  }, [buscarPerfilPorEmail]);

  return {
    // Dados
    publicacoes,
    destaques,
    todosVotos,
    todosComentarios,

    // Estado
    isLoading: isLoadingPublicacoes || isLoadingDestaques,
    isLoadingPublicacoes,
    isLoadingDestaques,

    // Helpers
    getVotosPublicacao,
    getComentariosPublicacao,
    getVotoUsuario,
    calcularVotosResumo,
    buscarPerfilPorEmail,
    buscarOuCriarPerfilAdmin,

    // Ações de publicação
    criarPublicacao,
    editarPublicacao,
    excluirPublicacao,
    toggleDestaque,

    // Ações de voto
    votar,

    // Ações de comentário
    adicionarComentario,
    editarComentario,
    excluirComentario,

    // Refetch
    refetchPublicacoes,
    refetchVotos,
    refetchComentarios,

    // Estados de mutação
    isCriando: criarPublicacaoMutation.isPending,
    isEditando: editarPublicacaoMutation.isPending,
    isExcluindo: excluirPublicacaoMutation.isPending,
    isVotando: votarMutation.isPending,
    isComentando: adicionarComentarioMutation.isPending,
  };
};
