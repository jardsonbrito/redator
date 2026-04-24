import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlanoAdmin {
  id: string;
  nome: string;
  nome_exibicao: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
}

export interface FuncionalidadeAdmin {
  id: string;
  chave: string;
  nome_exibicao: string;
  descricao: string | null;
  sempre_disponivel: boolean;
  ordem_aluno: number;
  ativo: boolean;
}

const PLANOS_KEY   = ['admin-planos']          as const;
const FUNC_KEY     = ['admin-funcionalidades'] as const;
const VISIT_KEY    = ['admin-visitante-features'] as const;
const PS_KEY       = ['admin-ps-features']     as const;
const TURMAS_KEY   = ['turmas-alunos-lista']   as const;

export interface TurmaAdmin {
  id: string;
  nome: string;
  ativo: boolean;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const useTurmas = () =>
  useQuery({
    queryKey: TURMAS_KEY,
    queryFn: async (): Promise<TurmaAdmin[]> => {
      const { data, error } = await supabase
        .from('turmas_alunos')
        .select('id, nome, ativo')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

export const usePlanos = () =>
  useQuery({
    queryKey: PLANOS_KEY,
    queryFn: async (): Promise<PlanoAdmin[]> => {
      const { data, error } = await supabase
        .from('planos')
        .select('id, nome, nome_exibicao, descricao, ativo, ordem')
        .order('ordem');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 0,
  });

export const useFuncionalidades = () =>
  useQuery({
    queryKey: FUNC_KEY,
    queryFn: async (): Promise<FuncionalidadeAdmin[]> => {
      const { data, error } = await supabase
        .from('funcionalidades')
        .select('id, chave, nome_exibicao, descricao, sempre_disponivel, ordem_aluno, ativo')
        .eq('ativo', true)
        .order('ordem_aluno');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 0,
  });

export const usePlanoFeatures = (planoId: string | null) =>
  useQuery({
    queryKey: ['admin-plano-features', planoId],
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data, error } = await supabase
        .from('plano_funcionalidades')
        .select('habilitado, funcionalidades(chave)')
        .eq('plano_id', planoId!);
      if (error) throw error;
      const result: Record<string, boolean> = {};
      (data ?? []).forEach((row: { habilitado: boolean; funcionalidades: { chave: string } | null }) => {
        if (row.funcionalidades?.chave) result[row.funcionalidades.chave] = row.habilitado;
      });
      return result;
    },
    enabled: !!planoId,
    staleTime: 0,
  });

export const useVisitanteFeatures = () =>
  useQuery({
    queryKey: VISIT_KEY,
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data, error } = await supabase
        .from('visitante_funcionalidades')
        .select('habilitado, funcionalidades(chave)');
      if (error) throw error;
      const result: Record<string, boolean> = {};
      (data ?? []).forEach((row: { habilitado: boolean; funcionalidades: { chave: string } | null }) => {
        if (row.funcionalidades?.chave) result[row.funcionalidades.chave] = row.habilitado;
      });
      return result;
    },
    staleTime: 0,
  });

export const usePSFeatures = () =>
  useQuery({
    queryKey: PS_KEY,
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data, error } = await supabase
        .from('ps_funcionalidades')
        .select('habilitado, funcionalidades(chave)');
      if (error) throw error;
      const result: Record<string, boolean> = {};
      (data ?? []).forEach((row: { habilitado: boolean; funcionalidades: { chave: string } | null }) => {
        if (row.funcionalidades?.chave) result[row.funcionalidades.chave] = row.habilitado;
      });
      return result;
    },
    staleTime: 0,
  });

// ── Mutations ────────────────────────────────────────────────────────────────

export const usePlansAdminMutations = () => {
  const qc = useQueryClient();

  // Toggle feature em um plano (otimista — rollback automático em erro)
  const toggleFeature = useMutation({
    mutationFn: async ({ planoId, planoNome, chave, habilitado }: {
      planoId: string; planoNome: string; chave: string; habilitado: boolean;
    }) => {
      const { data, error } = await supabase.rpc('upsert_plan_features', {
        p_plan_id: planoId,
        p_features: { [chave]: habilitado },
      });
      if (error) throw error;
      if (data === false) throw new Error('Banco retornou false');
      return { planoId, planoNome };
    },
    onMutate: async ({ planoId, chave, habilitado }) => {
      await qc.cancelQueries({ queryKey: ['admin-plano-features', planoId] });
      const prev = qc.getQueryData<Record<string, boolean>>(['admin-plano-features', planoId]);
      qc.setQueryData(['admin-plano-features', planoId], (old: Record<string, boolean> = {}) => ({
        ...old, [chave]: habilitado,
      }));
      return { prev, planoId };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(['admin-plano-features', ctx.planoId], ctx.prev);
      toast.error('Erro ao salvar permissão — alteração revertida');
    },
    onSuccess: ({ planoId, planoNome }) => {
      qc.invalidateQueries({ queryKey: ['admin-plano-features', planoId] });
      // invalida cache do aluno para que a mudança reflita imediatamente
      qc.invalidateQueries({ queryKey: ['db-plan-features', planoNome] });
    },
  });

  // Salvar acesso do visitante (bulk, botão explícito)
  const saveVisitante = useMutation({
    mutationFn: async (features: Record<string, boolean>) => {
      const { data, error } = await supabase.rpc('upsert_visitante_features', { p_features: features });
      if (error) throw error;
      if (data === false) throw new Error('Banco retornou false');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VISIT_KEY });
      qc.invalidateQueries({ queryKey: ['db-visitante-features'] });
      toast.success('Acesso do visitante salvo');
    },
    onError: () => toast.error('Erro ao salvar acesso do visitante'),
  });

  // Salvar acesso do Processo Seletivo (bulk, botão explícito)
  const savePS = useMutation({
    mutationFn: async (features: Record<string, boolean>) => {
      const { data, error } = await supabase.rpc('upsert_ps_features', { p_features: features });
      if (error) throw error;
      if (data === false) throw new Error('Banco retornou false');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PS_KEY });
      qc.invalidateQueries({ queryKey: ['db-ps-features'] });
      toast.success('Acesso do Processo Seletivo salvo');
    },
    onError: () => toast.error('Erro ao salvar acesso do Processo Seletivo'),
  });

  // Reordenar planos (otimista, salva ao soltar)
  const reorderPlanos = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const { data, error } = await supabase.rpc('reorder_planos', { p_ordered_ids: orderedIds });
      if (error) throw error;
      if (data === false) throw new Error('Banco retornou false');
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: PLANOS_KEY });
      const prev = qc.getQueryData<PlanoAdmin[]>(PLANOS_KEY);
      qc.setQueryData(PLANOS_KEY, (old: PlanoAdmin[] = []) =>
        orderedIds.map((id, i) => ({ ...(old.find(p => p.id === id)!), ordem: i + 1 }))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(PLANOS_KEY, ctx.prev);
      toast.error('Erro ao reordenar planos — revertido');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PLANOS_KEY }),
  });

  // Reordenar funcionalidades (otimista, botão explícito de salvar)
  const reorderFuncionalidades = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const { data, error } = await supabase.rpc('reorder_funcionalidades', { p_ordered_ids: orderedIds });
      if (error) throw error;
      if (data === false) throw new Error('Banco retornou false');
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: FUNC_KEY });
      const prev = qc.getQueryData<FuncionalidadeAdmin[]>(FUNC_KEY);
      qc.setQueryData(FUNC_KEY, (old: FuncionalidadeAdmin[] = []) =>
        orderedIds.map((id, i) => ({ ...(old.find(f => f.id === id)!), ordem_aluno: i + 1 }))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(FUNC_KEY, ctx.prev);
      toast.error('Erro ao reordenar cards — revertido');
    },
    onSuccess: () => toast.success('Ordem dos cards salva'),
    onSettled: () => qc.invalidateQueries({ queryKey: FUNC_KEY }),
  });

  // Ativar / desativar plano
  const togglePlanActive = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('planos').update({ ativo }).eq('id', id);
      if (error) throw error;
      return { id, ativo };
    },
    onMutate: async ({ id, ativo }) => {
      await qc.cancelQueries({ queryKey: PLANOS_KEY });
      const prev = qc.getQueryData<PlanoAdmin[]>(PLANOS_KEY);
      qc.setQueryData(PLANOS_KEY, (old: PlanoAdmin[] = []) =>
        old.map(p => p.id === id ? { ...p, ativo } : p)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(PLANOS_KEY, ctx.prev);
      toast.error('Erro ao atualizar status do plano');
    },
    onSuccess: ({ ativo }) => {
      qc.invalidateQueries({ queryKey: PLANOS_KEY });
      toast.success(ativo ? 'Plano ativado' : 'Plano desativado');
    },
  });

  // Editar nome de exibição e descrição (nome interno é imutável)
  const updatePlano = useMutation({
    mutationFn: async ({ id, nome_exibicao, descricao }: {
      id: string; nome_exibicao: string; descricao?: string;
    }) => {
      const { error } = await supabase
        .from('planos')
        .update({ nome_exibicao, descricao: descricao ?? null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLANOS_KEY });
      toast.success('Plano atualizado');
    },
    onError: () => toast.error('Erro ao atualizar plano'),
  });

  // Criar novo plano (com ou sem cópia de features)
  const createPlano = useMutation({
    mutationFn: async ({ nome, nome_exibicao, descricao, copiar_de_id }: {
      nome: string; nome_exibicao: string; descricao?: string; copiar_de_id?: string | null;
    }) => {
      const planos = qc.getQueryData<PlanoAdmin[]>(PLANOS_KEY) ?? [];
      const maxOrdem = planos.length > 0 ? Math.max(...planos.map(p => p.ordem)) : 0;

      const { data: novo, error } = await supabase
        .from('planos')
        .insert({ nome, nome_exibicao, descricao: descricao ?? null, ativo: true, ordem: maxOrdem + 1 })
        .select('id')
        .single();
      if (error) throw error;

      if (copiar_de_id) {
        const { data: srcFeats } = await supabase
          .from('plano_funcionalidades')
          .select('habilitado, funcionalidades(chave)')
          .eq('plano_id', copiar_de_id);
        if (srcFeats?.length) {
          const features: Record<string, boolean> = {};
          srcFeats.forEach((r: { habilitado: boolean; funcionalidades: { chave: string } | null }) => {
            if (r.funcionalidades?.chave) features[r.funcionalidades.chave] = r.habilitado;
          });
          await supabase.rpc('upsert_plan_features', { p_plan_id: novo.id, p_features: features });
        }
      } else {
        const funcs = qc.getQueryData<FuncionalidadeAdmin[]>(FUNC_KEY) ?? [];
        const blank: Record<string, boolean> = {};
        funcs.filter(f => !f.sempre_disponivel).forEach(f => { blank[f.chave] = false; });
        if (Object.keys(blank).length > 0) {
          await supabase.rpc('upsert_plan_features', { p_plan_id: novo.id, p_features: blank });
        }
      }

      return novo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLANOS_KEY });
      toast.success('Plano criado com sucesso');
    },
    onError: (err: Error) => toast.error(`Erro ao criar plano: ${err.message}`),
  });

  return {
    toggleFeature,
    saveVisitante,
    savePS,
    reorderPlanos,
    reorderFuncionalidades,
    togglePlanActive,
    updatePlano,
    createPlano,
  };
};
