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
  competencia: string;
  tipo: string | null;
  comentario: string;
  sugestao_reescrita: string | null;
  origem: 'jarvis' | 'corretor';
  status: 'sugerida' | 'confirmada' | 'ignorada';
  criado_em: string;
  atualizado_em: string;
}

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
    mutationFn: async ({ id, status, comentario }: { id: string; status: string; comentario?: string }) => {
      const update: Record<string, any> = { status };
      if (comentario !== undefined) update.comentario = comentario;
      const { error } = await supabase
        .from('comentarios_trecho_correcao')
        .update(update)
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

  const confirmar = (id: string, comentarioEditado?: string) =>
    mutacao.mutate({ id, status: 'confirmada', comentario: comentarioEditado });

  const ignorar = (id: string) =>
    mutacao.mutate({ id, status: 'ignorada' });

  const desfazer = (id: string) =>
    mutacao.mutate({ id, status: 'sugerida' });

  const sugeridas = marcacoes.filter(m => m.status === 'sugerida');
  const confirmadas = marcacoes.filter(m => m.status === 'confirmada');
  const ignoradas = marcacoes.filter(m => m.status === 'ignorada');

  return { marcacoes, isLoading, sugeridas, confirmadas, ignoradas, confirmar, ignorar, desfazer };
};
