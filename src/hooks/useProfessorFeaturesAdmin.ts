import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProfessorFuncionalidadeAdmin {
  id: string;
  chave: string;
  nome_exibicao: string;
  descricao: string | null;
  ordem_professor: number | null;
  habilitado_professor: boolean;
  sempre_disponivel: boolean;
  ativo: boolean;
}

const PROF_FUNC_KEY = ['admin-professor-funcionalidades'] as const;
const DASHBOARD_KEY = ['funcionalidades-professor-ordered'] as const;

// ── Query ─────────────────────────────────────────────────────────────────────

export const useProfessorFuncionalidadesAdmin = () =>
  useQuery({
    queryKey: PROF_FUNC_KEY,
    queryFn: async (): Promise<ProfessorFuncionalidadeAdmin[]> => {
      const { data, error } = await supabase
        .from('funcionalidades')
        .select('id, chave, nome_exibicao, descricao, ordem_professor, habilitado_professor, sempre_disponivel, ativo')
        .eq('ativo', true);

      if (error) throw error;

      const rows = (data ?? []) as ProfessorFuncionalidadeAdmin[];

      return rows.sort((a, b) => {
        // Habilitadas primeiro
        if (a.habilitado_professor !== b.habilitado_professor) {
          return a.habilitado_professor ? -1 : 1;
        }
        // Depois por ordem_professor (nulls por último)
        if (a.ordem_professor === null && b.ordem_professor !== null) return 1;
        if (a.ordem_professor !== null && b.ordem_professor === null) return -1;
        if (a.ordem_professor !== null && b.ordem_professor !== null) {
          return a.ordem_professor - b.ordem_professor;
        }
        return a.nome_exibicao.localeCompare(b.nome_exibicao, 'pt-BR');
      });
    },
    staleTime: 0,
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useProfessorFeaturesAdminMutations = () => {
  const qc = useQueryClient();

  // Toggle habilitado_professor (salva imediatamente via RPC)
  const toggleFeature = useMutation({
    mutationFn: async ({ chave, habilitado }: { chave: string; habilitado: boolean }) => {
      const { data, error } = await supabase.rpc('toggle_professor_feature', {
        p_chave: chave,
        p_habilitado: habilitado,
      });
      if (error) throw error;
      if (data === false) throw new Error('Banco retornou false');
    },
    onMutate: async ({ chave, habilitado }) => {
      await qc.cancelQueries({ queryKey: PROF_FUNC_KEY });
      const prev = qc.getQueryData<ProfessorFuncionalidadeAdmin[]>(PROF_FUNC_KEY);
      qc.setQueryData(PROF_FUNC_KEY, (old: ProfessorFuncionalidadeAdmin[] = []) =>
        old.map(f => f.chave === chave ? { ...f, habilitado_professor: habilitado } : f)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(PROF_FUNC_KEY, ctx.prev);
      toast.error('Erro ao salvar permissão — alteração revertida');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROF_FUNC_KEY });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
    },
  });

  // Reordenar funcionalidades do professor (botão "Salvar Ordem")
  const reorderFuncionalidades = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const { data, error } = await supabase.rpc('reorder_professor_funcionalidades', {
        p_ordered_ids: orderedIds,
      });
      if (error) throw error;
      if (data === false) throw new Error('Banco retornou false');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROF_FUNC_KEY });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
      toast.success('Ordem dos cards salva');
    },
    onError: () => toast.error('Erro ao reordenar cards — tente novamente'),
  });

  return { toggleFeature, reorderFuncionalidades };
};
