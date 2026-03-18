import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ==================== TIPOS ====================

export interface LaboratorioAula {
  id: string;
  titulo: string;
  subtitulo: string;
  frase_tematica: string;
  eixos: string[];
  nome_autor: string;
  descricao_autor: string;
  obra_referencia: string;
  ideia_central: string;
  paragrafo_modelo: string;
  imagem_autor_url: string | null;
  observacao_paragrafo: string | null;
  tipo_paragrafo: string;
  temas_sugeridos: string[];
  frases_tematicas_manuais: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface NovaAulaInput {
  titulo: string;
  subtitulo: string;
  frase_tematica: string;
  eixos: string[];
  nome_autor: string;
  descricao_autor: string;
  obra_referencia: string;
  ideia_central: string;
  paragrafo_modelo: string;
  observacao_paragrafo?: string | null;
  tipo_paragrafo?: string;
  imagem_autor_url?: string | null;
  temas_sugeridos?: string[];
  frases_tematicas_manuais?: string[];
}

// Contexto passado para a Produção Guiada via localStorage
export interface LaboratorioContexto {
  laboratorio_id: string;
  titulo: string;
  nome_autor: string;
  obra_referencia: string;
  paragrafo_modelo: string;
  tema_id?: string;
  frase_tematica_tema?: string;
}

export const LABORATORIO_CONTEXTO_KEY = 'laboratorio_contexto';

// ==================== UPLOAD HELPERS ====================

/**
 * Converte um arquivo de imagem para WebP via Canvas (client-side).
 * Normaliza dimensões máximas para 600x600 (quadrada, adequada para foto de autor).
 */
export async function converterParaWebP(file: File, maxSize = 600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Falha ao converter imagem para WebP'));
        },
        'image/webp',
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar imagem'));
    };

    img.src = url;
  });
}

/**
 * Faz upload da imagem do autor para o bucket 'laboratorio-autores'.
 * Retorna a URL pública.
 */
export async function uploadImagemAutor(aulaId: string, blob: Blob): Promise<string> {
  const path = `${aulaId}/autor.webp`;

  const { error } = await supabase.storage
    .from('laboratorio-autores')
    .upload(path, blob, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '3600',
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('laboratorio-autores')
    .getPublicUrl(path);

  // Cache-busting para garantir que a nova imagem seja exibida
  return `${data.publicUrl}?v=${Date.now()}`;
}

// ==================== HOOK ====================

export const useRepertorioLaboratorio = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ==================== QUERIES ====================

  const {
    data: aulas = [],
    isLoading,
    refetch: refetchAulas,
  } = useQuery({
    queryKey: ['repertorio-laboratorio'],
    queryFn: async (): Promise<LaboratorioAula[]> => {
      const { data, error } = await supabase
        .from('repertorio_laboratorio')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar aulas do laboratório:', error);
        throw error;
      }

      return (data || []) as LaboratorioAula[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Query para admin (inclui inativas)
  const {
    data: todasAulas = [],
    isLoading: isLoadingAdmin,
    refetch: refetchTodasAulas,
  } = useQuery({
    queryKey: ['repertorio-laboratorio-admin'],
    queryFn: async (): Promise<LaboratorioAula[]> => {
      const { data, error } = await supabase
        .from('repertorio_laboratorio')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar aulas (admin):', error);
        throw error;
      }

      return (data || []) as LaboratorioAula[];
    },
    staleTime: 1000 * 60 * 1,
  });

  // Buscar aula por ID
  const buscarAulaPorId = useCallback(async (id: string): Promise<LaboratorioAula | null> => {
    const { data, error } = await supabase
      .from('repertorio_laboratorio')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar aula:', error);
      return null;
    }

    return data as LaboratorioAula;
  }, []);

  // ==================== MUTATIONS ====================

  const criarAulaMutation = useMutation({
    mutationFn: async (input: NovaAulaInput) => {
      const { data, error } = await supabase
        .from('repertorio_laboratorio')
        .insert({
          titulo: input.titulo,
          subtitulo: input.subtitulo,
          frase_tematica: input.frase_tematica,
          eixos: input.eixos,
          nome_autor: input.nome_autor,
          descricao_autor: input.descricao_autor,
          obra_referencia: input.obra_referencia,
          ideia_central: input.ideia_central,
          paragrafo_modelo: input.paragrafo_modelo,
          observacao_paragrafo: input.observacao_paragrafo || null,
          tipo_paragrafo: input.tipo_paragrafo ?? 'introducao',
          imagem_autor_url: input.imagem_autor_url || null,
          temas_sugeridos: input.temas_sugeridos ?? [],
          frases_tematicas_manuais: input.frases_tematicas_manuais ?? [],
          ativo: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LaboratorioAula;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-laboratorio'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-laboratorio-admin'] });
      toast({ title: 'Aula criada', description: 'A aula do laboratório foi cadastrada com sucesso.' });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar aula:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar a aula.', variant: 'destructive' });
    },
  });

  const editarAulaMutation = useMutation({
    mutationFn: async ({ id, ...input }: NovaAulaInput & { id: string }) => {
      const { data, error } = await supabase
        .from('repertorio_laboratorio')
        .update({
          titulo: input.titulo,
          subtitulo: input.subtitulo,
          frase_tematica: input.frase_tematica,
          eixos: input.eixos,
          nome_autor: input.nome_autor,
          descricao_autor: input.descricao_autor,
          obra_referencia: input.obra_referencia,
          ideia_central: input.ideia_central,
          paragrafo_modelo: input.paragrafo_modelo,
          observacao_paragrafo: input.observacao_paragrafo ?? null,
          tipo_paragrafo: input.tipo_paragrafo ?? 'introducao',
          imagem_autor_url: input.imagem_autor_url ?? undefined,
          temas_sugeridos: input.temas_sugeridos ?? [],
          frases_tematicas_manuais: input.frases_tematicas_manuais ?? [],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LaboratorioAula;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-laboratorio'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-laboratorio-admin'] });
      toast({ title: 'Aula atualizada', description: 'A aula foi editada com sucesso.' });
    },
    onError: (error: Error) => {
      console.error('Erro ao editar aula:', error);
      toast({ title: 'Erro', description: 'Não foi possível editar a aula.', variant: 'destructive' });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('repertorio_laboratorio')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-laboratorio'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-laboratorio-admin'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao alterar status:', error);
      toast({ title: 'Erro', description: 'Não foi possível alterar o status.', variant: 'destructive' });
    },
  });

  const excluirAulaMutation = useMutation({
    mutationFn: async (id: string) => {
      // Remover imagem do storage antes de excluir o registro
      await supabase.storage
        .from('laboratorio-autores')
        .remove([`${id}/autor.webp`]);

      const { error } = await supabase
        .from('repertorio_laboratorio')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertorio-laboratorio'] });
      queryClient.invalidateQueries({ queryKey: ['repertorio-laboratorio-admin'] });
      toast({ title: 'Aula excluída', description: 'A aula foi removida com sucesso.' });
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir aula:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir a aula.', variant: 'destructive' });
    },
  });

  // ==================== WRAPPERS ====================

  const criarAula = useCallback(
    async (input: NovaAulaInput) => criarAulaMutation.mutateAsync(input),
    [criarAulaMutation]
  );

  const editarAula = useCallback(
    async (id: string, input: NovaAulaInput) => editarAulaMutation.mutateAsync({ id, ...input }),
    [editarAulaMutation]
  );

  const toggleAtivo = useCallback(
    async (id: string, ativo: boolean) => toggleAtivoMutation.mutateAsync({ id, ativo }),
    [toggleAtivoMutation]
  );

  const excluirAula = useCallback(
    async (id: string) => excluirAulaMutation.mutateAsync(id),
    [excluirAulaMutation]
  );

  // ==================== CONTEXTO PRODUÇÃO GUIADA ====================

  const salvarContextoLaboratorio = useCallback((contexto: LaboratorioContexto) => {
    localStorage.setItem(LABORATORIO_CONTEXTO_KEY, JSON.stringify(contexto));
  }, []);

  const limparContextoLaboratorio = useCallback(() => {
    localStorage.removeItem(LABORATORIO_CONTEXTO_KEY);
  }, []);

  const lerContextoLaboratorio = useCallback((): LaboratorioContexto | null => {
    const raw = localStorage.getItem(LABORATORIO_CONTEXTO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LaboratorioContexto;
    } catch {
      return null;
    }
  }, []);

  // ==================== RETORNO ====================

  return {
    // Dados (aluno)
    aulas,
    isLoading,
    refetchAulas,

    // Dados (admin)
    todasAulas,
    isLoadingAdmin,
    refetchTodasAulas,

    // Busca por ID
    buscarAulaPorId,

    // Ações
    criarAula,
    editarAula,
    toggleAtivo,
    excluirAula,

    // Contexto Produção Guiada
    salvarContextoLaboratorio,
    limparContextoLaboratorio,
    lerContextoLaboratorio,

    // Estados de mutação
    isCriando: criarAulaMutation.isPending,
    isEditando: editarAulaMutation.isPending,
    isExcluindo: excluirAulaMutation.isPending,
  };
};
