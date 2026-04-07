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

// ─── Constantes pedagógicas ───────────────────────────────────────────────────

/**
 * Para cada competência, o código do erro primário mais representativo.
 * A detecção NÃO usa threshold fixo — é relativa por redação (ver bootstrap).
 */
const COMPETENCIAS: Array<{ campo: string; codigo: string }> = [
  { campo: 'nota_c1', codigo: 'C1_CONCORDANCIA' },
  { campo: 'nota_c2', codigo: 'C2_REPERTORIO'   },
  { campo: 'nota_c3', codigo: 'C3_TESE'         },
  { campo: 'nota_c4', codigo: 'C4_CONECTIVOS'   },
  { campo: 'nota_c5', codigo: 'C5_PROPOSTA'     },
];

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

  // 2. Buscar todas as fontes de diagnóstico em paralelo (últimos 6 meses)
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
  const desde = seisMesesAtras.toISOString();

  const [
    { data: redacoes },
    { data: simulados },
    { data: exercicios },
    { data: lousas },
    { data: quizErros },
  ] = await Promise.all([
    // 1. Redações tema livre — notas C1-C5 explícitas (fonte primária)
    supabase
      .from('redacoes_enviadas')
      .select('nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, data_correcao, id')
      .ilike('email_aluno', emailNorm)
      .not('nota_total', 'is', null)
      .gte('data_correcao', desde)
      .is('deleted_at', null)
      .order('data_correcao', { ascending: false })
      .limit(30),

    // 2. Redações de simulado — notas C1-C5 explícitas (fonte primária)
    supabase
      .from('redacoes_simulado')
      .select('nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, data_correcao, id')
      .ilike('email_aluno', emailNorm)
      .not('nota_total', 'is', null)
      .gte('data_correcao', desde)
      .is('deleted_at', null)
      .order('data_correcao', { ascending: false })
      .limit(20),

    // 3. Redações de exercício — mesma estrutura C1-C5 (fonte primária, estava ignorada)
    supabase
      .from('redacoes_exercicio')
      .select('nota_c1, nota_c2, nota_c3, nota_c4, nota_c5, data_correcao, id')
      .ilike('email_aluno', emailNorm)
      .not('nota_total', 'is', null)
      .gte('data_correcao', desde)
      .is('deleted_at', null)
      .order('data_correcao', { ascending: false })
      .limit(20),

    // 4. Lousas corrigidas — nota 0-10, título identifica a competência (fonte secundária)
    supabase
      .from('lousa_resposta')
      .select('nota, submitted_at, lousa_id, lousa:lousa_id(titulo)')
      .ilike('email_aluno', emailNorm)
      .not('nota', 'is', null)
      .gte('submitted_at', desde)
      .order('submitted_at', { ascending: false })
      .limit(30),

    // 5. Erros em quizzes de microaprendizagem — acertou=false, título do tópico identifica competência
    supabase
      .from('micro_quiz_tentativas')
      .select(`
        acertou,
        created_at,
        questao:questao_id(
          item:item_id(
            topico:topico_id(titulo)
          )
        )
      `)
      .ilike('email_aluno', emailNorm)
      .eq('acertou', false)
      .gte('created_at', desde)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  // Todas as fontes primárias (têm notas C1-C5 estruturadas)
  const todasRedacoes = [
    ...(redacoes ?? []),
    ...(simulados ?? []),
    ...(exercicios ?? []),
  ];

  const totalFontesSecundarias = (lousas ?? []).length + (quizErros ?? []).length;

  // Sem nenhum dado histórico disponível: plano não pode ser gerado
  if (todasRedacoes.length === 0 && totalFontesSecundarias === 0) return false;

  // ─── Inferência de competência pelo título da lousa ───────────────────────
  // O título das lousas indica diretamente a competência trabalhada.
  // Exemplos reais: "Competência 1", "Competência 2 (aspecto 1)",
  // "Paralelismo Sintático" (C1), "Reconhecimento dos 3 momentos da Introdução" (C3)

  function inferirEixoDaLousa(titulo: string): string | null {
    const t = titulo.toLowerCase();
    // Referência direta: "competência X" ou "competencia X"
    const matchDireto = t.match(/compet[eê]ncia\s+([1-5])/);
    if (matchDireto) return `C${matchDireto[1]}`;
    // Palavras-chave C1 — norma culta
    if (/ponto|vírgula|pontua|concord|regência|sintax|paralel|ortogr|gramát|norma culta/i.test(titulo)) return 'C1';
    // Palavras-chave C2 — tema e repertório
    if (/repertório|repertorio|tema|sociocult|contextuali|frase temát/i.test(titulo)) return 'C2';
    // Palavras-chave C3 — argumentação
    if (/argum|tese|introdução|introduc|desenvolvi|paragraf|estrutura do text/i.test(titulo)) return 'C3';
    // Palavras-chave C4 — coesão
    if (/coes|conect|articulac|articulaç|coerên|coer|referenci|pronome/i.test(titulo)) return 'C4';
    // Palavras-chave C5 — proposta
    if (/proposta|interven|conclus|agente|finalidade|efeito/i.test(titulo)) return 'C5';
    return null;
  }

  // ─── Mapa de erro por eixo (para lousas) ─────────────────────────────────
  const ERRO_POR_EIXO: Record<string, string> = {
    C1: 'C1_CONCORDANCIA',
    C2: 'C2_REPERTORIO',
    C3: 'C3_TESE',
    C4: 'C4_CONECTIVOS',
    C5: 'C5_PROPOSTA',
  };

  // 3. Contagem unificada de erros por competência
  //
  // Fonte primária (redações): para cada texto, detecta as 2 piores competências
  //   (ranking relativo interno). Só conta se nota < 160 — evita penalizar
  //   alunos por competências onde já vão bem.
  //
  // Fonte secundária (lousas): nota < 7 em uma lousa indica dificuldade
  //   na competência inferida pelo título. Peso reduzido (0.5 por ocorrência)
  //   para não sobrepor o sinal mais rico das redações.

  interface ContagemErro { count: number; somaNotas: number }
  const contagem = new Map<string, ContagemErro>();

  // — Redações e simulados —
  for (const r of todasRedacoes) {
    const notasRedacao = COMPETENCIAS
      .map(c => ({ codigo: c.codigo, nota: (r as any)[c.campo] }))
      .filter(n => typeof n.nota === 'number')
      .sort((a, b) => a.nota - b.nota);

    if (notasRedacao.length === 0) continue;

    // 2 piores desta redação, apenas se < 160
    const detectadas = notasRedacao.slice(0, 2).filter(n => n.nota < 160);

    for (const { codigo, nota } of detectadas) {
      const cur = contagem.get(codigo) ?? { count: 0, somaNotas: 0 };
      cur.count += 1;
      cur.somaNotas += nota;
      contagem.set(codigo, cur);
    }
  }

  // — Lousas corrigidas (fonte secundária, peso 0.5) —
  // Detecta dificuldade quando nota < 7 e o título da lousa indica a competência.
  for (const l of (lousas ?? [])) {
    const titulo = (l as any).lousa?.titulo ?? '';
    const eixo = inferirEixoDaLousa(titulo);
    if (!eixo) continue;

    const nota = typeof l.nota === 'number' ? l.nota : 10;
    if (nota >= 7) continue; // desempenho satisfatório, não conta

    const codigo = ERRO_POR_EIXO[eixo];
    const notaConvertida = nota * 20; // escala 0-10 → 0-200
    const cur = contagem.get(codigo) ?? { count: 0, somaNotas: 0 };
    cur.count += 0.5;
    cur.somaNotas += notaConvertida * 0.5;
    contagem.set(codigo, cur);
  }

  // — Quizzes de microaprendizagem (fonte terciária, peso 0.3) —
  // Cada erro em quiz (acertou=false) sinaliza dificuldade no tópico.
  // A competência é inferida pelo título do tópico (mesma lógica das lousas).
  for (const q of (quizErros ?? [])) {
    const tituloTopico = (q as any).questao?.item?.topico?.titulo ?? '';
    if (!tituloTopico) continue;

    const eixo = inferirEixoDaLousa(tituloTopico); // reutiliza o mesmo inferidor
    if (!eixo) continue;

    const codigo = ERRO_POR_EIXO[eixo];
    const cur = contagem.get(codigo) ?? { count: 0, somaNotas: 0 };
    // Nota sintética: quiz errado = desempenho muito baixo (40/200 = 20%)
    cur.count += 0.3;
    cur.somaNotas += 40 * 0.3;
    contagem.set(codigo, cur);
  }

  if (contagem.size === 0) return false;

  // 4. Ordenar: maior recorrência primeiro; em empate, menor nota média (mais urgente)
  const errosOrdenados = Array.from(contagem.entries())
    .map(([codigo, v]) => ({
      codigo,
      count: v.count,
      avgNota: Math.round(v.somaNotas / v.count),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.avgNota - b.avgNota; // menor nota = mais urgente no empate
    })
    .slice(0, 3);

  // 5. Upsert na pep_consolidacao_erros
  for (const e of errosOrdenados) {
    const erro = taxonomiaMap.get(e.codigo);
    if (!erro) continue;

    await supabase
      .from('pep_consolidacao_erros')
      .upsert({
        aluno_email: emailNorm,
        erro_id: erro.id,
        recorrencia: e.count,
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
  // "Total" para o motivo = redações + simulados + exercícios corrigidos (fontes primárias)
  const total = todasRedacoes.length;

  const tasksParaInserir = errosOrdenados.map((e, idx) => {
    const erro = taxonomiaMap.get(e.codigo)!;
    const eixoLabel = EIXO_NOME[erro.eixo] ?? erro.eixo;
    const recursoId = recursoParaErro(e.codigo);

    const acaoBase = recursoId
      ? `Acesse o recurso vinculado a esta missão e conclua a atividade proposta.`
      : `Revise o conteúdo sobre ${ERRO_NOME[e.codigo] ?? erro.nome} disponível em Aulas Gravadas ou Microaprendizagem.`;

    // Motivo com dados reais do aluno: recorrência + nota média
    const motivo = e.count === 1
      ? `Em uma das suas redações corrigidas, esta foi a competência com pior resultado (média de ${e.avgNota} pontos em ${eixoLabel}).`
      : `Esta competência foi uma das mais frágeis em ${e.count} das suas ${total} redações analisadas, com média de ${e.avgNota} pontos (${eixoLabel}).`;

    return {
      aluno_email: emailNorm,
      erro_id: erro.id,
      recurso_id: recursoId,
      titulo: ERRO_NOME[e.codigo] ?? erro.nome,
      motivo,
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
