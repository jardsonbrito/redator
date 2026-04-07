import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PEPAspecto {
  id: string;
  competencia: 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export interface PEPMarcacao {
  id: string;
  aluno_email: string;
  redacao_id: string;
  redacao_tipo: 'regular' | 'simulado' | 'exercicio';
  competencia: 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
  aspecto_id: string;
  corretor_email: string | null;
  created_at: string;
  aspecto?: PEPAspecto;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Todos os aspectos ativos, organizados por competência */
export function useAspectosPEP() {
  return useQuery({
    queryKey: ['pep-aspectos'],
    queryFn: async (): Promise<PEPAspecto[]> => {
      const { data, error } = await supabase
        .from('pep_aspectos')
        .select('*')
        .eq('ativo', true)
        .order('competencia')
        .order('ordem');
      if (error) throw error;
      return (data ?? []) as PEPAspecto[];
    },
    staleTime: 5 * 60_000,
  });
}

/** Todos os aspectos (ativo ou não) — para o admin */
export function useAspectosPEPAdmin() {
  return useQuery({
    queryKey: ['pep-aspectos-admin'],
    queryFn: async (): Promise<PEPAspecto[]> => {
      const { data, error } = await supabase
        .from('pep_aspectos')
        .select('*')
        .order('competencia')
        .order('ordem');
      if (error) throw error;
      return (data ?? []) as PEPAspecto[];
    },
    staleTime: 30_000,
  });
}

/** Marcações já feitas para uma redação específica */
export function useMarcacoesRedacao(redacaoId: string | undefined) {
  return useQuery({
    queryKey: ['pep-marcacoes-redacao', redacaoId],
    queryFn: async (): Promise<PEPMarcacao[]> => {
      if (!redacaoId) return [];
      const { data, error } = await supabase
        .from('pep_marcacoes_corretor')
        .select('*, aspecto:aspecto_id(*)')
        .eq('redacao_id', redacaoId);
      if (error) throw error;
      return (data ?? []) as PEPMarcacao[];
    },
    enabled: !!redacaoId,
    staleTime: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

interface SalvarMarcacoesPayload {
  alunoEmail: string;
  redacaoId: string;
  redacaoTipo: 'regular' | 'simulado' | 'exercicio';
  corretorEmail: string;
  aspectosSelecionados: string[]; // array de aspecto_id
  aspectosTodos: PEPAspecto[];
}

/**
 * Substitui todas as marcações de uma redação pelos aspectos selecionados.
 * Usa delete + insert (idempotente — pode ser chamado múltiplas vezes).
 */
export function useSalvarMarcacoesPEP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      alunoEmail,
      redacaoId,
      redacaoTipo,
      corretorEmail,
      aspectosSelecionados,
      aspectosTodos,
    }: SalvarMarcacoesPayload) => {
      // Remove marcações anteriores desta redação
      const { error: errDel } = await supabase
        .from('pep_marcacoes_corretor')
        .delete()
        .eq('redacao_id', redacaoId);
      if (errDel) throw errDel;

      if (aspectosSelecionados.length === 0) return;

      // Monta novos registros com a competência de cada aspecto
      const aspectoMap = new Map(aspectosTodos.map(a => [a.id, a]));
      const novasMarcacoes = aspectosSelecionados.map(aid => ({
        aluno_email: alunoEmail.toLowerCase().trim(),
        redacao_id: redacaoId,
        redacao_tipo: redacaoTipo,
        competencia: aspectoMap.get(aid)?.competencia ?? 'C1',
        aspecto_id: aid,
        corretor_email: corretorEmail.toLowerCase().trim(),
      }));

      const { error: errIns } = await supabase
        .from('pep_marcacoes_corretor')
        .insert(novasMarcacoes);
      if (errIns) throw errIns;
    },
    onSuccess: (_, { redacaoId, alunoEmail }) => {
      qc.invalidateQueries({ queryKey: ['pep-marcacoes-redacao', redacaoId] });
      // Invalida o plano do aluno para que seja recalculado no próximo acesso
      qc.invalidateQueries({ queryKey: ['pep-tasks-aluno', alunoEmail.toLowerCase().trim()] });
      toast.success('Marcações do Plano de Estudo salvas.');
    },
    onError: () => {
      toast.error('Erro ao salvar marcações. Tente novamente.');
    },
  });
}

// ─── Admin: CRUD de aspectos ──────────────────────────────────────────────────

export function useCriarAspecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { competencia: string; nome: string; descricao?: string; ordem: number }) => {
      const { error } = await supabase.from('pep_aspectos').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pep-aspectos'] });
      qc.invalidateQueries({ queryKey: ['pep-aspectos-admin'] });
      toast.success('Aspecto criado.');
    },
    onError: () => toast.error('Erro ao criar aspecto.'),
  });
}

export function useEditarAspecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; nome?: string; descricao?: string; ordem?: number; ativo?: boolean }) => {
      const { error } = await supabase
        .from('pep_aspectos')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pep-aspectos'] });
      qc.invalidateQueries({ queryKey: ['pep-aspectos-admin'] });
      toast.success('Aspecto atualizado.');
    },
    onError: () => toast.error('Erro ao atualizar aspecto.'),
  });
}

export function useExcluirAspecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pep_aspectos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pep-aspectos'] });
      qc.invalidateQueries({ queryKey: ['pep-aspectos-admin'] });
      toast.success('Aspecto excluído.');
    },
    onError: () => toast.error('Erro ao excluir aspecto. Verifique se há marcações vinculadas.'),
  });
}
