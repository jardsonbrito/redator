import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PEPTaxonomiaErro {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  eixo: string;
}

export interface PEPRecurso {
  id: string;
  tipo: string;
  recurso_id: string | null;
  titulo: string;
  descricao: string | null;
  url_direta: string | null;
  tags_erros: string[];
}

export interface PEPTask {
  id: string;
  aluno_email: string;
  erro_id: string | null;
  recurso_id: string | null;
  titulo: string;
  motivo: string;
  acao: string;
  criterio_conclusao: string;
  status: 'ativa' | 'concluida' | 'bloqueada' | 'cancelada';
  ordem: number;
  gerada_por: string;
  gerada_em: string;
  ativada_em: string | null;
  concluida_em: string | null;
  // joins
  erro?: PEPTaxonomiaErro | null;
  recurso?: PEPRecurso | null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Task ativa do aluno */
export function useTaskAtiva(email: string | undefined) {
  return useQuery({
    queryKey: ['pep-task-ativa', email],
    queryFn: async (): Promise<PEPTask | null> => {
      if (!email) return null;
      const { data, error } = await supabase
        .from('pep_tasks')
        .select(`
          *,
          erro:pep_taxonomia_erros(*),
          recurso:pep_recursos(*)
        `)
        .eq('aluno_email', email.toLowerCase().trim())
        .eq('status', 'ativa')
        .order('ordem', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PEPTask | null;
    },
    enabled: !!email,
    staleTime: 60_000,
  });
}

/** Todas as tasks do aluno (ativa + bloqueadas + histórico) */
export function useTasksAluno(email: string | undefined) {
  return useQuery({
    queryKey: ['pep-tasks-aluno', email],
    queryFn: async (): Promise<PEPTask[]> => {
      if (!email) return [];
      const { data, error } = await supabase
        .from('pep_tasks')
        .select(`
          *,
          erro:pep_taxonomia_erros(*),
          recurso:pep_recursos(*)
        `)
        .eq('aluno_email', email.toLowerCase().trim())
        .neq('status', 'cancelada')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PEPTask[];
    },
    enabled: !!email,
    staleTime: 60_000,
  });
}

/** Top erros consolidados do aluno */
export function useErrosAluno(email: string | undefined) {
  return useQuery({
    queryKey: ['pep-erros-aluno', email],
    queryFn: async () => {
      if (!email) return [];
      const { data, error } = await supabase
        .from('pep_consolidacao_erros')
        .select('*, erro:pep_taxonomia_erros(*)')
        .eq('aluno_email', email.toLowerCase().trim())
        .order('recorrencia', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!email,
    staleTime: 120_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Marca a task ativa como concluída e ativa a próxima */
export function useConcluirTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, alunoEmail }: { taskId: string; alunoEmail: string }) => {
      // 1. Buscar ordem da task atual
      const { data: taskAtual, error: errBusca } = await supabase
        .from('pep_tasks')
        .select('ordem')
        .eq('id', taskId)
        .single();
      if (errBusca) throw errBusca;

      // 2. Marcar como concluída
      const { error: errConcluir } = await supabase
        .from('pep_tasks')
        .update({ status: 'concluida', concluida_em: new Date().toISOString() })
        .eq('id', taskId);
      if (errConcluir) throw errConcluir;

      // 3. Ativar próxima task bloqueada (ordem imediatamente superior)
      const { data: proxima } = await supabase
        .from('pep_tasks')
        .select('id')
        .eq('aluno_email', alunoEmail.toLowerCase().trim())
        .eq('status', 'bloqueada')
        .gt('ordem', taskAtual.ordem)
        .order('ordem', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (proxima) {
        await supabase
          .from('pep_tasks')
          .update({ status: 'ativa', ativada_em: new Date().toISOString() })
          .eq('id', proxima.id);
      }
    },
    onSuccess: (_, { alunoEmail }) => {
      qc.invalidateQueries({ queryKey: ['pep-task-ativa', alunoEmail] });
      qc.invalidateQueries({ queryKey: ['pep-tasks-aluno', alunoEmail] });
      toast.success('Missão concluída! Próxima missão desbloqueada.');
    },
    onError: () => {
      toast.error('Erro ao concluir missão. Tente novamente.');
    },
  });
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

/** Tempo parado em task ativa (dias) */
export function diasParado(ativadaEm: string | null): number | null {
  if (!ativadaEm) return null;
  const diff = Date.now() - new Date(ativadaEm).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Label amigável do tipo de recurso */
export function labelTipoRecurso(tipo: string): string {
  const map: Record<string, string> = {
    aula: 'Aula Gravada',
    micro_topico: 'Microaprendizagem',
    exercicio: 'Exercício',
    lousa: 'Lousa',
    guia_tematico: 'Guia Temático',
    producao_guiada: 'Produção Guiada',
  };
  return map[tipo] ?? tipo;
}

/** Rota da plataforma para navegar ao recurso */
export function rotaRecurso(recurso: PEPRecurso): string {
  switch (recurso.tipo) {
    case 'aula':          return '/aulas';
    case 'micro_topico':  return recurso.recurso_id ? `/microaprendizagem/${recurso.recurso_id}` : '/microaprendizagem';
    case 'exercicio':     return '/exercicios';
    case 'lousa':         return '/lousa';
    case 'guia_tematico': return '/guia-tematico';
    case 'producao_guiada': return recurso.recurso_id ? `/exercicios/${recurso.recurso_id}/producao-guiada` : '/exercicios';
    default:              return recurso.url_direta ?? '/app';
  }
}
