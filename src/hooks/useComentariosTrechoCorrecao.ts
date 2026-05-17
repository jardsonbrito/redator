import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ComentarioTrecho {
  id: string;
  redacao_enviada_id: string;
  jarvis_correcao_id: string | null;
  trecho: string;
  inicio: number;
  fim: number;
  contexto_anterior: string | null;
  contexto_posterior: string | null;
  ocorrencia: number;
  paragrafo: number | null;
  competencia: string;
  tipo: string | null;
  comentario: string;
  sugestao_reescrita: string | null;
  origem: 'jarvis' | 'corretor';
  status: 'sugerida' | 'confirmada' | 'ignorada';
  criado_em: string;
  atualizado_em: string;
}

export type EdicoesAnotacao = {
  comentario?: string;
  competencia?: string;
  tipo?: string;
  sugestao_reescrita?: string;
};

export const useComentariosTrechoCorrecao = (redacaoEnviadaId: string | null | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['comentarios-trecho-correcao', redacaoEnviadaId];

  const { data: marcacoes = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comentarios_trecho_correcao')
        .select('*')
        .eq('redacao_enviada_id', redacaoEnviadaId!)
        .order('inicio', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ComentarioTrecho[];
    },
    enabled: !!redacaoEnviadaId,
    staleTime: 1000 * 30,
  });

  const mutacao = useMutation({
    mutationFn: async (update: {
      id: string; status: string;
      comentario?: string; competencia?: string; tipo?: string; sugestao_reescrita?: string;
    }) => {
      const { id, ...fields } = update;
      const updateData: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) updateData[k] = v;
      }
      const { error } = await supabase
        .from('comentarios_trecho_correcao')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar marcação", variant: "destructive" });
    },
  });

  const confirmar = (id: string, edicoes?: EdicoesAnotacao) =>
    mutacao.mutate({ id, status: 'confirmada', ...edicoes });

  const ignorar = (id: string) =>
    mutacao.mutate({ id, status: 'ignorada' });

  const desfazer = (id: string) =>
    mutacao.mutate({ id, status: 'sugerida' });

  const mutacaoInserir = useMutation({
    mutationFn: async (nova: {
      trecho: string; inicio: number; fim: number;
      paragrafo?: number;
      competencia: string; tipo?: string;
      comentario: string; sugestao_reescrita?: string;
    }) => {
      const { error } = await supabase
        .from('comentarios_trecho_correcao')
        .insert({
          redacao_enviada_id: redacaoEnviadaId!,
          trecho: nova.trecho,
          inicio: nova.inicio,
          fim: nova.fim,
          ocorrencia: 1,
          paragrafo: nova.paragrafo ?? null,
          competencia: nova.competencia,
          tipo: nova.tipo ?? null,
          comentario: nova.comentario,
          sugestao_reescrita: nova.sugestao_reescrita ?? null,
          origem: 'corretor',
          status: 'confirmada',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      toast({ title: "Erro ao criar marcação", variant: "destructive" });
    },
  });

  const inserir = (nova: Parameters<typeof mutacaoInserir.mutate>[0]) =>
    mutacaoInserir.mutate(nova);

  const sugeridas = marcacoes.filter(m => m.status === 'sugerida');
  const confirmadas = marcacoes.filter(m => m.status === 'confirmada');
  const ignoradas = marcacoes.filter(m => m.status === 'ignorada');

  return {
    marcacoes, isLoading, sugeridas, confirmadas, ignoradas,
    confirmar, ignorar, desfazer,
    inserir, isInserting: mutacaoInserir.isPending,
    isSaving: mutacao.isPending,
  };
};
