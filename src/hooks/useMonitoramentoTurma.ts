import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { RADAR_CONFIG } from '@/config/radarConfig';
import { FaixaConfig } from '@/config/radarConfig';
import {
  ScoreMetrica,
  ScoreRedacoes,
  ScorePresenca,
  Evolucao,
  StatusBolsista,
  calcularScoreRedacoes,
  calcularScorePresenca,
  calcularScoreComOferta,
  calcularScoreSemOferta,
  calcularScoreGeral,
  classificarScoreGeral,
  compararScores,
  calcularStatusBolsista,
  alunoAptoParaAvaliar,
  Alerta,
  gerarAlertas,
} from '@/utils/radarScore';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface AlunoMonitoramento {
  id: string;
  nome: string;
  email: string;
  dataAprovacao: string | null;
  aptoParaAvaliar: boolean;
  isBolsista: boolean;

  // Scores por métrica (engajamento)
  redacoes: ScoreRedacoes;
  presenca: ScorePresenca;
  exercicios: ScoreMetrica;
  lousa: ScoreMetrica;
  micro: ScoreMetrica;
  guia: ScoreMetrica;
  repertorio: ScoreMetrica;

  // Score geral de engajamento (0-10)
  scoreGeral: number | null;
  scoreGeralAnterior: number | null;
  faixaGeral: FaixaConfig | null;
  evolucaoGeral: Evolucao;
  statusBolsista: StatusBolsista;

  // Alertas
  alertas: Alerta[];

  // Prioridade de ordenação
  prioridade: number;

  // Desempenho por nota (0-1000, média de lousa+exercícios+redações)
  notaDesempenho: number | null;
  grupoDesempenho: 'acompanhamento' | 'consolidado' | null;
}

export interface ResumoTurma {
  total: number;
  porFaixa: Record<string, number>;
  semDados: number;
  totalBolsistas: number;
  bolsistasOk: number;
  bolsistasAtencao: number;
  bolsistasRisco: number;
  bolsistasAlerta: number;
  // Grupos de desempenho por nota
  desempenhoAcompanhamento: number;
  desempenhoConsolidado: number;
  desempenhoSemNota: number;
}

export interface MonitoramentoResult {
  alunos: AlunoMonitoramento[];
  resumo: ResumoTurma;
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function inTs(dateStr: string | null | undefined, start: string, end: string): boolean {
  return !!dateStr && dateStr >= start && dateStr <= end;
}

function inDate(dateStr: string | null | undefined, start: string, end: string): boolean {
  return !!dateStr && dateStr >= start && dateStr <= end;
}

function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

function calcularPrioridade(aluno: AlunoMonitoramento): number {
  if (!aluno.aptoParaAvaliar || aluno.scoreGeral === null) return 85;

  const score = aluno.scoreGeral;
  const nivel = aluno.statusBolsista.nivel;
  const fLabel = aluno.faixaGeral?.label ?? '';
  const evoGeral = aluno.evolucaoGeral.tipo;

  if (nivel === 'alerta') return 0;
  if (nivel === 'risco') return 5;
  if (fLabel === 'Crítico' && evoGeral === 'queda_forte') return 10;
  if (fLabel === 'Crítico') return 15;
  if (evoGeral === 'queda_forte' && fLabel === 'Baixo desempenho') return 20;
  if (evoGeral === 'queda_forte') return 25;
  if (nivel === 'atencao') return 30;
  if (fLabel === 'Baixo desempenho') return 35 + Math.round(10 - score);
  if (fLabel === 'Abaixo da média' && evoGeral === 'queda') return 46;
  if (fLabel === 'Abaixo da média') return 48;

  // Adequados e excelentes: ordenar por score decrescente
  return 50 + Math.round(10 - score);
}

// ─── Função principal ─────────────────────────────────────────────────────────

async function fetchMonitoramentoTurma(
  turma: string,
  mes: number,
  ano: number
): Promise<MonitoramentoResult> {
  const hoje = new Date().toISOString().split('T')[0];

  // Ranges de 2 meses: atual (m0) e anterior (m1)
  const meses = [0, 1].map(i => {
    const base = subMonths(new Date(ano, mes - 1, 1), i);
    const s = startOfMonth(base);
    const e = endOfMonth(base);
    return {
      start: s.toISOString(),
      end: e.toISOString(),
      dateStart: format(s, 'yyyy-MM-dd'),
      dateEnd: format(e, 'yyyy-MM-dd'),
    };
  });

  const [m0, m1] = meses;

  // Range combinado dos 2 meses
  const rangeStart = m1.start;
  const rangeEnd = m0.end;
  const rangeDateStart = m1.dateStart;
  const rangeDateEnd = m0.dateEnd;

  // 1. Perfis da turma
  const { data: perfis } = await supabase
    .from('profiles')
    .select('id, nome, email, data_aprovacao')
    .eq('user_type', 'aluno')
    .eq('ativo', true)
    .eq('turma', turma)
    .order('nome');

  if (!perfis || perfis.length === 0) {
    return {
      alunos: [],
      resumo: {
        total: 0,
        porFaixa: {},
        semDados: 0,
        totalBolsistas: 0,
        bolsistasOk: 0,
        bolsistasAtencao: 0,
        bolsistasRisco: 0,
        bolsistasAlerta: 0,
      },
    };
  }

  const emails = perfis.map(p => p.email.toLowerCase().trim());
  const profileIds = perfis.map(p => p.id);

  // 2. Queries paralelas — tudo no range de 2 meses
  const [
    bolsistasRes,
    redEnvRes,
    redSimRes,
    redExeRes,
    radarRes,
    presencasRes,
    aulasRes,
    lousasRes,
    lousasDisponiveisRes,
    microRes,
    microDisponiveisRes,
    guiasRes,
    guiasDisponiveisRes,
    repPRes,
    repFRes,
    repORes,
  ] = await Promise.all([
    supabase
      .from('assinaturas')
      .select('aluno_id')
      .in('aluno_id', profileIds)
      .eq('plano', 'Bolsista')
      .gte('data_validade', hoje),

    // Redações enviadas
    supabase
      .from('redacoes_enviadas')
      .select('email_aluno, data_envio, nota_total')
      .in('email_aluno', emails)
      .gte('data_envio', rangeStart)
      .lte('data_envio', rangeEnd),

    supabase
      .from('redacoes_simulado')
      .select('email_aluno, data_envio, nota_total')
      .in('email_aluno', emails)
      .gte('data_envio', rangeStart)
      .lte('data_envio', rangeEnd),

    supabase
      .from('redacoes_exercicio')
      .select('email_aluno, data_envio, nota_total')
      .in('email_aluno', emails)
      .gte('data_envio', rangeStart)
      .lte('data_envio', rangeEnd),

    // Exercícios Radar
    supabase
      .from('radar_dados')
      .select('email_aluno, data_realizacao, nota')
      .in('email_aluno', emails)
      .gte('data_realizacao', rangeDateStart)
      .lte('data_realizacao', rangeDateEnd),

    // Presenças
    supabase
      .from('presenca_aulas')
      .select('email_aluno, aula_id, entrada_at')
      .in('email_aluno', emails)
      .not('entrada_at', 'is', null)
      .gte('entrada_at', rangeStart)
      .lte('entrada_at', rangeEnd),

    // Aulas ofertadas
    supabase
      .from('aulas_virtuais')
      .select('id, data_aula, aula_mae_id')
      .contains('turmas_autorizadas', [turma])
      .gte('data_aula', rangeDateStart)
      .lte('data_aula', rangeDateEnd),

    // Lousas respondidas
    supabase
      .from('lousa_resposta')
      .select('email_aluno, lousa_id, submitted_at, nota')
      .in('email_aluno', emails)
      .not('submitted_at', 'is', null)
      .gte('submitted_at', rangeStart)
      .lte('submitted_at', rangeEnd),

    // Lousas disponíveis (oferta)
    supabase
      .from('lousa')
      .select('id, created_at')
      .contains('turmas_autorizadas', [turma])
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd),

    // Micro concluídos
    (supabase as any)
      .from('micro_progresso')
      .select('email_aluno, concluido_em')
      .in('email_aluno', emails)
      .eq('status', 'concluido')
      .gte('concluido_em', rangeStart)
      .lte('concluido_em', rangeEnd),

    // Micro disponíveis (aproximação: todos os tópicos publicados)
    (supabase as any)
      .from('micro_topicos')
      .select('id, created_at')
      .eq('status', 'published')
      .lte('created_at', rangeEnd),

    // Guias concluídos
    (supabase as any)
      .from('guias_tematicos_conclusoes')
      .select('aluno_email, guia_id, concluded_at')
      .in('aluno_email', emails)
      .gte('concluded_at', rangeStart)
      .lte('concluded_at', rangeEnd),

    // Guias disponíveis
    (supabase as any)
      .from('guias_tematicos')
      .select('id, created_at')
      .eq('status', 'published')
      .lte('created_at', rangeEnd),

    // Repertório
    supabase
      .from('repertorio_publicacoes')
      .select('autor_id, created_at')
      .in('autor_id', profileIds)
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd),

    supabase
      .from('repertorio_frases')
      .select('autor_id, created_at')
      .in('autor_id', profileIds)
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd),

    supabase
      .from('repertorio_obras')
      .select('autor_id, created_at')
      .in('autor_id', profileIds)
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd),
  ]);

  // 3. Sets e grupos para lookup rápido
  const bolsistasSet = new Set((bolsistasRes.data ?? []).map(b => b.aluno_id));

  const redEnvByEmail = groupBy(redEnvRes.data ?? [], r => r.email_aluno);
  const redSimByEmail = groupBy(redSimRes.data ?? [], r => r.email_aluno);
  const redExeByEmail = groupBy(redExeRes.data ?? [], r => r.email_aluno);
  const radarByEmail = groupBy(radarRes.data ?? [], r => r.email_aluno);
  const presencasByEmail = groupBy(presencasRes.data ?? [], r => r.email_aluno);
  const lousasByEmail = groupBy(lousasRes.data ?? [], r => r.email_aluno);
  const microByEmail = groupBy(microRes.data ?? [], r => r.email_aluno);
  const guiasData = (guiasRes.data ?? []) as { aluno_email: string; guia_id: string; concluded_at: string }[];
  const guiasByEmail = groupBy(guiasData, r => r.aluno_email);
  const repPByAutor = groupBy(repPRes.data ?? [], r => r.autor_id);
  const repFByAutor = groupBy(repFRes.data ?? [], r => r.autor_id);
  const repOByAutor = groupBy(repORes.data ?? [], r => r.autor_id);

  // 4. Função: calcular métricas de um aluno num mês específico
  function getMetricasMes(email: string, autorId: string, m: typeof m0) {
    // Redações
    const redEnv = (redEnvByEmail.get(email) ?? []).filter(r => inTs(r.data_envio, m.start, m.end)).length;
    const redExe = (redExeByEmail.get(email) ?? []).filter(r => inTs(r.data_envio, m.start, m.end)).length;
    const redSim = (redSimByEmail.get(email) ?? []).filter(r => inTs(r.data_envio, m.start, m.end)).length;

    const redacoesSimulado = redSim;
    const redacoesRegulares = redEnv + redExe;

    // Exercícios Radar
    const exercicios = (radarByEmail.get(email) ?? []).filter(r => inDate(r.data_realizacao, m.dateStart, m.dateEnd)).length;

    // Presenças
    const presencasDoMes = (presencasByEmail.get(email) ?? []).filter(p => inTs(p.entrada_at, m.start, m.end));
    const presencasDistinct = new Set(presencasDoMes.map(p => p.aula_id)).size;

    const aulasDoMes = (aulasRes.data ?? []).filter(a => inDate(a.data_aula, m.dateStart, m.dateEnd));
    const aulasOfertadas = aulasDoMes.filter(a => !a.aula_mae_id).length;

    // Lousas
    const lousasDoMes = (lousasByEmail.get(email) ?? []).filter(l => inTs(l.submitted_at, m.start, m.end));
    const lousas = new Set(lousasDoMes.map(l => l.lousa_id)).size;

    const lousasDisponiveisDoMes = (lousasDisponiveisRes.data ?? []).filter(l =>
      inTs(l.created_at, m.start, m.end)
    ).length;

    // Micro
    const microItens = (microByEmail.get(email) ?? []).filter(mi => inTs(mi.concluido_em, m.start, m.end)).length;

    const microDisponiveisDoMes = (microDisponiveisRes.data ?? []).filter(mt =>
      mt.created_at && mt.created_at <= m.end
    ).length;

    // Guias
    const guiasDoMes = (guiasByEmail.get(email) ?? []).filter(g => inTs(g.concluded_at, m.start, m.end));
    const guias = new Set(guiasDoMes.map(g => g.guia_id)).size;

    const guiasDisponiveisDoMes = (guiasDisponiveisRes.data ?? []).filter(gt =>
      gt.created_at && gt.created_at <= m.end
    ).length;

    // Repertório
    const repertorio =
      (repPByAutor.get(autorId) ?? []).filter(r => inTs(r.created_at, m.start, m.end)).length +
      (repFByAutor.get(autorId) ?? []).filter(r => inTs(r.created_at, m.start, m.end)).length +
      (repOByAutor.get(autorId) ?? []).filter(r => inTs(r.created_at, m.start, m.end)).length;

    // Notas reais para cálculo de desempenho (apenas m0 será usado)
    const notasLousaDoMes = (lousasByEmail.get(email) ?? [])
      .filter(l => inTs(l.submitted_at, m.start, m.end) && l.nota !== null)
      .map(l => (l.nota as number) * 100); // normaliza 0-10 → 0-1000

    const notasExerciciosDoMes = (radarByEmail.get(email) ?? [])
      .filter(r => inDate(r.data_realizacao, m.dateStart, m.dateEnd) && (r as any).nota !== null)
      .map(r => (r as any).nota as number);

    const notasRedacoesDoMes = [
      ...(redEnvByEmail.get(email) ?? [])
        .filter(r => inTs(r.data_envio, m.start, m.end) && (r as any).nota_total !== null)
        .map(r => (r as any).nota_total as number),
      ...(redSimByEmail.get(email) ?? [])
        .filter(r => inTs(r.data_envio, m.start, m.end) && (r as any).nota_total !== null)
        .map(r => (r as any).nota_total as number),
      ...(redExeByEmail.get(email) ?? [])
        .filter(r => inTs(r.data_envio, m.start, m.end) && (r as any).nota_total !== null)
        .map(r => (r as any).nota_total as number),
    ];

    return {
      redacoesSimulado,
      redacoesRegulares,
      presencas: presencasDistinct,
      aulasOfertadas,
      exercicios,
      exerciciosOferta: 3, // Meta fixa de exercícios por mês (pode ser ajustado)
      lousas,
      lousasOferta: lousasDisponiveisDoMes,
      micro: microItens,
      microOferta: microDisponiveisDoMes,
      guias,
      guiasOferta: guiasDisponiveisDoMes,
      repertorio,
      notasLousa: notasLousaDoMes,
      notasExercicios: notasExerciciosDoMes,
      notasRedacoes: notasRedacoesDoMes,
    };
  }

  function calcularNotaDesempenho(
    notasLousa: number[],
    notasExercicios: number[],
    notasRedacoes: number[],
  ): number | null {
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const fontes = [avg(notasLousa), avg(notasExercicios), avg(notasRedacoes)]
      .filter(v => v !== null) as number[];
    if (fontes.length === 0) return null;
    return Math.round(fontes.reduce((a, b) => a + b, 0) / fontes.length);
  }

  // 5. Montar objetos AlunoMonitoramento
  const alunos: AlunoMonitoramento[] = perfis.map(p => {
    const email = p.email.toLowerCase().trim();
    const autorId = p.id;
    const apto = alunoAptoParaAvaliar(p.data_aprovacao, mes, ano);

    const metricasM0 = getMetricasMes(email, autorId, m0);
    const metricasM1 = getMetricasMes(email, autorId, m1);

    // Calcular scores por métrica
    const redacoes = calcularScoreRedacoes(
      metricasM0.redacoesSimulado,
      metricasM0.redacoesRegulares,
      metricasM1.redacoesSimulado,
      metricasM1.redacoesRegulares
    );

    const presenca = calcularScorePresenca(
      metricasM0.presencas,
      metricasM0.aulasOfertadas,
      metricasM1.presencas,
      metricasM1.aulasOfertadas
    );

    const exercicios = calcularScoreComOferta(
      metricasM0.exercicios,
      metricasM0.exerciciosOferta,
      metricasM1.exercicios,
      metricasM1.exerciciosOferta
    );

    const lousa = calcularScoreComOferta(
      metricasM0.lousas,
      metricasM0.lousasOferta,
      metricasM1.lousas,
      metricasM1.lousasOferta
    );

    const micro = calcularScoreComOferta(
      metricasM0.micro,
      metricasM0.microOferta,
      metricasM1.micro,
      metricasM1.microOferta
    );

    const guia = calcularScoreComOferta(
      metricasM0.guias,
      metricasM0.guiasOferta,
      metricasM1.guias,
      metricasM1.guiasOferta
    );

    const repertorio = calcularScoreSemOferta(metricasM0.repertorio, metricasM1.repertorio);

    // Score geral
    const scoreGeralAtual = calcularScoreGeral({
      redacoes: redacoes.score,
      presenca: presenca.score,
      exercicios: exercicios.score,
      lousa: lousa.score,
      micro: micro.score,
      guia: guia.score,
      repertorio: repertorio.score,
    });

    const scoreGeralAnterior = calcularScoreGeral({
      redacoes: redacoes.valorAnterior !== null ? 100 : null, // Simplificação
      presenca: presenca.valorAnterior !== null && metricasM1.aulasOfertadas > 0
        ? (presenca.valorAnterior / metricasM1.aulasOfertadas) * 100
        : null,
      exercicios: exercicios.valorAnterior !== null && metricasM1.exerciciosOferta > 0
        ? (exercicios.valorAnterior / metricasM1.exerciciosOferta) * 100
        : null,
      lousa: lousa.valorAnterior !== null && metricasM1.lousasOferta > 0
        ? (lousa.valorAnterior / metricasM1.lousasOferta) * 100
        : null,
      micro: micro.valorAnterior !== null && metricasM1.microOferta > 0
        ? (micro.valorAnterior / metricasM1.microOferta) * 100
        : null,
      guia: guia.valorAnterior !== null && metricasM1.guiasOferta > 0
        ? (guia.valorAnterior / metricasM1.guiasOferta) * 100
        : null,
      repertorio: repertorio.valorAnterior !== null ? 100 : null,
    });

    // Se não apto, zerar score geral
    const scoreGeral = !apto ? null : scoreGeralAtual;
    const scoreGeralAnt = scoreGeralAnterior;

    const faixaGeral = classificarScoreGeral(scoreGeral);
    const evolucaoGeral = compararScores(scoreGeral, scoreGeralAnt);

    const isBolsista = bolsistasSet.has(p.id);
    const statusBolsista = calcularStatusBolsista(isBolsista, scoreGeral, {
      redacoes,
      presenca,
      exercicios,
    }, [scoreGeralAnt, scoreGeral]);

    const alertas = gerarAlertas(
      { redacoes, presenca, exercicios, lousa, micro, guia, repertorio },
      scoreGeral,
      isBolsista
    );

    const notaDesempenho = calcularNotaDesempenho(
      metricasM0.notasLousa,
      metricasM0.notasExercicios,
      metricasM0.notasRedacoes,
    );

    const grupoDesempenho: 'acompanhamento' | 'consolidado' | null =
      notaDesempenho === null ? null :
      notaDesempenho <= 599 ? 'acompanhamento' : 'consolidado';

    const parcial: AlunoMonitoramento = {
      id: p.id,
      nome: p.nome,
      email,
      dataAprovacao: p.data_aprovacao,
      aptoParaAvaliar: apto,
      isBolsista,
      redacoes,
      presenca,
      exercicios,
      lousa,
      micro,
      guia,
      repertorio,
      scoreGeral,
      scoreGeralAnterior: scoreGeralAnt,
      faixaGeral,
      evolucaoGeral,
      statusBolsista,
      alertas,
      prioridade: 0,
      notaDesempenho,
      grupoDesempenho,
    };

    return { ...parcial, prioridade: calcularPrioridade(parcial) };
  });

  // 6. Ordenar por prioridade
  alunos.sort((a, b) => a.prioridade - b.prioridade || a.nome.localeCompare(b.nome));

  // 7. Resumo da turma
  const porFaixa: Record<string, number> = {};
  RADAR_CONFIG.faixasScoreGeral.forEach(f => {
    porFaixa[f.label] = 0;
  });

  let semDados = 0,
    totalBolsistas = 0,
    bolsistasOk = 0,
    bolsistasAtencao = 0,
    bolsistasRisco = 0,
    bolsistasAlerta = 0,
    desempenhoAcompanhamento = 0,
    desempenhoConsolidado = 0,
    desempenhoSemNota = 0;

  for (const a of alunos) {
    if (!a.aptoParaAvaliar || a.scoreGeral === null) {
      semDados++;
    } else if (a.faixaGeral) {
      porFaixa[a.faixaGeral.label] = (porFaixa[a.faixaGeral.label] ?? 0) + 1;
    }

    if (a.isBolsista) {
      totalBolsistas++;
      switch (a.statusBolsista.nivel) {
        case 'ok':
          bolsistasOk++;
          break;
        case 'atencao':
          bolsistasAtencao++;
          break;
        case 'risco':
          bolsistasRisco++;
          break;
        case 'alerta':
          bolsistasAlerta++;
          break;
      }
    }

    if (a.grupoDesempenho === 'acompanhamento')      desempenhoAcompanhamento++;
    else if (a.grupoDesempenho === 'consolidado')    desempenhoConsolidado++;
    else                                             desempenhoSemNota++;
  }

  return {
    alunos,
    resumo: {
      total: alunos.length,
      porFaixa,
      semDados,
      totalBolsistas,
      bolsistasOk,
      bolsistasAtencao,
      bolsistasRisco,
      bolsistasAlerta,
      desempenhoAcompanhamento,
      desempenhoConsolidado,
      desempenhoSemNota,
    },
  };
}

// ─── Hook exportado ───────────────────────────────────────────────────────────

export function useMonitoramentoTurma(turma: string | null, mes: number, ano: number) {
  return useQuery({
    queryKey: ['monitoramentoTurma', turma, mes, ano],
    queryFn: () => fetchMonitoramentoTurma(turma!, mes, ano),
    enabled: !!turma,
    staleTime: 3 * 60 * 1000,
  });
}
