import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

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

// ─── Mapeamento nota → erro primário ─────────────────────────────────────────
// Threshold: nota < 120 = abaixo de "medianamente" (ENEM: 0-40-80-120-160-200)
const COMPETENCIA_ERRO_PRIMARIO: Record<string, string> = {
  nota_c1: 'C1_CONCORDANCIA',
  nota_c2: 'C2_REPERTORIO',
  nota_c3: 'C3_TESE',
  nota_c4: 'C4_CONECTIVOS',
  nota_c5: 'C5_PROPOSTA',
};

const ERRO_NOME: Record<string, string> = {
  C1_CONCORDANCIA: 'Concordância e norma culta',
  C2_REPERTORIO:   'Uso de repertório sociocultural',
  C3_TESE:         'Construção de tese',
  C4_CONECTIVOS:   'Uso de conectivos e coesão',
  C5_PROPOSTA:     'Proposta de intervenção',
};

const EIXO_NOME: Record<string, string> = {
  C1: 'Norma Culta',
  C2: 'Repertório e Tema',
  C3: 'Argumentação',
  C4: 'Coesão',
  C5: 'Proposta de Intervenção',
};

// ─── Core: bootstrap retroativo ───────────────────────────────────────────────

/**
 * Lê o histórico de redações já corrigidas e gera automaticamente
 * o plano (consolidação + top 3 tasks) para o aluno.
 * Só executa se o aluno não tiver nenhuma task ainda.
 */
async function bootstrapPlanoFromHistorico(email: string): Promise<boolean> {
  const emailNorm = email.toLowerCase().trim();

  // 1. Buscar a taxonomia para obter os IDs reais dos erros
  const { data: taxonomia } = await supabase
    .from('pep_taxonomia_erros')
    .select('id, codigo, nome, eixo')
    .eq('ativo', true);

  if (!taxonomia || taxonomia.length === 0) return false;

  const taxonomiaMap = new Map<string, PEPTaxonomiaErro>(
    taxonomia.map(t => [t.codigo, t as PEPTaxonomiaErro])
  );

  // 2. Buscar redações corrigidas (últimos 6 meses para ter histórico útil)
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
  const desde = seisMesesAtras.toISOString();

  const [{ data: redacoes }, { data: simulados }] = await Promise.all([
    supabase
      .from('redacoes_enviadas')
      .select('nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, data_correcao, id')
      .ilike('email_aluno', emailNorm)
      .not('nota_total', 'is', null)
      .gte('data_correcao', desde)
      .is('deleted_at', null)
      .order('data_correcao', { ascending: false })
      .limit(30),

    supabase
      .from('redacoes_simulado')
      .select('nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, data_correcao, id')
      .ilike('email_aluno', emailNorm)
      .not('nota_total', 'is', null)
      .gte('data_correcao', desde)
      .is('deleted_at', null)
      .order('data_correcao', { ascending: false })
      .limit(20),
  ]);

  const todasRedacoes = [...(redacoes ?? []), ...(simulados ?? [])];

  if (todasRedacoes.length === 0) return false;

  // 3. Contar ocorrências de erro por competência (nota < 120 = necessita atenção)
  const contagem = new Map<string, number>();

  for (const r of todasRedacoes) {
    for (const [campo, codigo] of Object.entries(COMPETENCIA_ERRO_PRIMARIO)) {
      const nota = (r as any)[campo];
      if (typeof nota === 'number' && nota < 120) {
        contagem.set(codigo, (contagem.get(codigo) ?? 0) + 1);
      }
    }
  }

  if (contagem.size === 0) return false;

  // 4. Ordenar por recorrência (maior → menor) e pegar top 3
  const errosOrdenados = Array.from(contagem.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // 5. Upsert na pep_consolidacao_erros
  for (const [codigo, rec] of errosOrdenados) {
    const erro = taxonomiaMap.get(codigo);
    if (!erro) continue;

    await supabase
      .from('pep_consolidacao_erros')
      .upsert({
        aluno_email: emailNorm,
        erro_id: erro.id,
        recorrencia: rec,
        ultima_deteccao: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'aluno_email,erro_id' });
  }

  // 6. Tentar buscar recurso vinculado ao erro (se houver no catálogo)
  const { data: recursos } = await supabase
    .from('pep_recursos')
    .select('id, tipo, titulo, tags_erros')
    .eq('ativo', true);

  const recursoParaErro = (codigo: string): string | null => {
    if (!recursos) return null;
    const rec = recursos.find(r => r.tags_erros?.includes(codigo));
    return rec?.id ?? null;
  };

  // 7. Gerar tasks (1 ativa + 2 bloqueadas)
  const agora = new Date().toISOString();

  const tasksParaInserir = errosOrdenados.map(([codigo, rec], idx) => {
    const erro = taxonomiaMap.get(codigo)!;
    const total = todasRedacoes.length;
    const eixoLabel = EIXO_NOME[erro.eixo] ?? erro.eixo;
    const recursoId = recursoParaErro(codigo);

    const acaoBase = recursoId
      ? `Acesse o recurso vinculado a esta missão e conclua a atividade proposta.`
      : `Revise o conteúdo sobre ${ERRO_NOME[codigo] ?? erro.nome} disponível em Aulas Gravadas ou Microaprendizagem.`;

    return {
      aluno_email: emailNorm,
      erro_id: erro.id,
      recurso_id: recursoId,
      titulo: ERRO_NOME[codigo] ?? erro.nome,
      motivo: `Esse ponto apareceu com baixo desempenho em ${rec} das suas ${total} redações analisadas no período. É o foco prioritário de ${eixoLabel}.`,
      acao: acaoBase,
      criterio_conclusao: recursoId
        ? 'Acesse e conclua a atividade vinculada a esta missão.'
        : 'Complete uma atividade sobre esse tema (lousa, exercício ou redação) e demonstre melhora.',
      status: idx === 0 ? 'ativa' : 'bloqueada',
      ordem: idx + 1,
      gerada_por: 'sistema',
      gerada_em: agora,
      ativada_em: idx === 0 ? agora : null,
    };
  });

  const { error: errInsert } = await supabase
    .from('pep_tasks')
    .insert(tasksParaInserir);

  return !errInsert;
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
        .select(`*, erro:pep_taxonomia_erros(*), recurso:pep_recursos(*)`)
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
        .select(`*, erro:pep_taxonomia_erros(*), recurso:pep_recursos(*)`)
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

// ─── Bootstrap automático ─────────────────────────────────────────────────────

/**
 * Hook que observa se o aluno não tem tasks e dispara o bootstrap retroativo.
 * Executa apenas uma vez por sessão por aluno (controlado via ref).
 */
export function useBootstrapPEP(email: string | undefined) {
  const qc = useQueryClient();
  const bootstrappedRef = useRef<Set<string>>(new Set());

  const { data: tasks, isLoading } = useTasksAluno(email);
  const { mutate: rodarBootstrap, isPending } = useMutation({
    mutationFn: async (em: string) => bootstrapPlanoFromHistorico(em),
    onSuccess: (gerou, em) => {
      if (gerou) {
        qc.invalidateQueries({ queryKey: ['pep-tasks-aluno', em] });
        qc.invalidateQueries({ queryKey: ['pep-task-ativa', em] });
      }
    },
  });

  useEffect(() => {
    if (!email || isLoading || isPending) return;
    if (tasks && tasks.length > 0) return; // já tem tasks, não faz nada
    const key = email.toLowerCase().trim();
    if (bootstrappedRef.current.has(key)) return; // já rodou nesta sessão
    bootstrappedRef.current.add(key);
    rodarBootstrap(key);
  }, [email, isLoading, tasks, isPending]);

  return { bootstrapping: isPending };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Marca a task ativa como concluída e ativa a próxima */
export function useConcluirTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, alunoEmail }: { taskId: string; alunoEmail: string }) => {
      const { data: taskAtual, error: errBusca } = await supabase
        .from('pep_tasks')
        .select('ordem')
        .eq('id', taskId)
        .single();
      if (errBusca) throw errBusca;

      const { error: errConcluir } = await supabase
        .from('pep_tasks')
        .update({ status: 'concluida', concluida_em: new Date().toISOString() })
        .eq('id', taskId);
      if (errConcluir) throw errConcluir;

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

export function diasParado(ativadaEm: string | null): number | null {
  if (!ativadaEm) return null;
  return Math.floor((Date.now() - new Date(ativadaEm).getTime()) / (1000 * 60 * 60 * 24));
}

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

export function rotaRecurso(recurso: PEPRecurso): string {
  switch (recurso.tipo) {
    case 'aula':            return '/aulas';
    case 'micro_topico':    return recurso.recurso_id ? `/microaprendizagem/${recurso.recurso_id}` : '/microaprendizagem';
    case 'exercicio':       return '/exercicios';
    case 'lousa':           return '/lousa';
    case 'guia_tematico':   return '/guia-tematico';
    case 'producao_guiada': return recurso.recurso_id ? `/exercicios/${recurso.recurso_id}/producao-guiada` : '/exercicios';
    default:                return recurso.url_direta ?? '/app';
  }
}
