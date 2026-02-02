import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminNote, AdminNoteInsert, AdminNoteUpdate, NoteFilters, NoteImage } from '@/types/admin-notes';
import { useAuth } from './useAuth';

export const useAdminNotes = (filters?: NoteFilters) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query para buscar todas as anotações
  const { data: notes, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-notes', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('admin_notes')
        .select('*')
        .eq('admin_id', user.id);

      // Aplicar filtros
      if (!filters?.incluir_arquivadas) {
        query = query.eq('arquivado', false);
      }

      if (filters?.categoria) {
        query = query.eq('categoria', filters.categoria);
      }

      if (filters?.cor) {
        query = query.eq('cor', filters.cor);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      // Ordenar: fixadas primeiro, depois por data de atualização
      query = query.order('fixado', { ascending: false });
      query = query.order('atualizado_em', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Se houver termo de busca, filtrar no cliente
      let result = data as AdminNote[];
      if (filters?.termo_busca) {
        const termo = filters.termo_busca.toLowerCase();
        result = result.filter(note =>
          note.titulo.toLowerCase().includes(termo) ||
          note.conteudo?.toLowerCase().includes(termo) ||
          note.categoria?.toLowerCase().includes(termo) ||
          note.tags?.some(tag => tag.toLowerCase().includes(termo))
        );
      }

      return result;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minuto
  });

  // Mutation para criar anotação
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: AdminNoteInsert) => {
      const { data, error } = await supabase
        .from('admin_notes')
        .insert(noteData)
        .select()
        .single();

      if (error) throw error;
      return data as AdminNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] });
      toast({
        title: 'Sucesso',
        description: 'Anotação criada com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Erro ao criar anotação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar anotação. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para atualizar anotação
  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: AdminNoteUpdate }) => {
      const { data, error } = await supabase
        .from('admin_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AdminNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] });
      toast({
        title: 'Sucesso',
        description: 'Anotação atualizada com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar anotação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar anotação. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para deletar anotação
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      // Primeiro, buscar a anotação para deletar as imagens
      const { data: note } = await supabase
        .from('admin_notes')
        .select('imagens')
        .eq('id', noteId)
        .single();

      if (note?.imagens && Array.isArray(note.imagens)) {
        // Deletar imagens do storage
        const imagePaths = (note.imagens as NoteImage[])
          .map(img => img.bucket_path)
          .filter((path): path is string => !!path);

        if (imagePaths.length > 0) {
          await supabase.storage
            .from('admin-notes')
            .remove(imagePaths);
        }
      }

      // Deletar a anotação
      const { error } = await supabase
        .from('admin_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] });
      toast({
        title: 'Sucesso',
        description: 'Anotação deletada com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Erro ao deletar anotação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao deletar anotação. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para alternar fixação
  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, fixado }: { noteId: string; fixado: boolean }) => {
      const { data, error } = await supabase
        .from('admin_notes')
        .update({ fixado })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] });
    },
    onError: (error) => {
      console.error('Erro ao fixar/desafixar anotação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar anotação. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para alternar arquivamento
  const toggleArchiveMutation = useMutation({
    mutationFn: async ({ noteId, arquivado }: { noteId: string; arquivado: boolean }) => {
      const { data, error } = await supabase
        .from('admin_notes')
        .update({ arquivado })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes'] });
      toast({
        title: 'Sucesso',
        description: 'Anotação arquivada com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Erro ao arquivar/desarquivar anotação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar anotação. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Função para fazer upload de imagens
  const uploadImage = async (file: File, noteId: string): Promise<NoteImage | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${noteId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('admin-notes')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('admin-notes')
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        nome: file.name,
        tamanho: file.size,
        bucket_path: fileName,
      };
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao fazer upload da imagem. Tente novamente.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Função para deletar imagem
  const deleteImage = async (bucketPath: string) => {
    try {
      const { error } = await supabase.storage
        .from('admin-notes')
        .remove([bucketPath]);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
    }
  };

  return {
    notes: notes || [],
    isLoading,
    error,
    refetch,
    createNote: createNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    togglePin: togglePinMutation.mutate,
    toggleArchive: toggleArchiveMutation.mutate,
    uploadImage,
    deleteImage,
    isCreating: createNoteMutation.isPending,
    isUpdating: updateNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
  };
};
