import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { RADAR_CONFIG } from '@/config/radarConfig';
import { FaixaConfig, TendenciaConfig } from '@/config/radarConfig';
import {
  MetricasSimples,
  MetasEfetivas,
  StatusBolsista,
  calcularScore,
  classificarFaixa,
  calcularTendencia,
  gerarStatusComposto,
  calcularStatusBolsista,
  calcularMetasEfetivas,
  alunoAptoParaAvaliar,
} from '@/utils/radarScore';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface TendenciaInfo extends TendenciaConfig {
  delta: number;
}

export interface AlunoMonitoramento {
  id:            string;
  nome:          string;
  email:         string;
  dataAprovacao: string | null;
  aptoParaAvaliar: boolean;
  isBolsista:    boolean;

  scoreMesAtual:    number | null;
  scoreMesAnterior: number | null;
  scoreMesDoisAtras: number | null;
  confiancaMesAtual: 'total' | 'parcial' | 'insuficiente';

  faixa:         FaixaConfig | null;
  tendencia:     TendenciaInfo | null;
  statusComposto: string;
  statusBolsista: StatusBolsista;

  metricas:   MetricasSimples;
  prioridade: number;
}

export interface ResumoTurma {
  total:            number;
  porFaixa:         Record<string, number>;
  semDados:         number;
  totalBolsistas:   number;
  bolsistasOk:      number;
  bolsistasAtencao: number;
  bolsistasRisco:   number;
  bolsistasAlerta:  number;
  metasEfetivas:    MetasEfetivas;
}

export interface MonitoramentoResult {
  alunos:  AlunoMonitoramento[];
  resumo:  ResumoTurma;
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
  if (!aluno.aptoParaAvaliar || aluno.confiancaMesAtual === 'insuficiente') return 85;

  const score  = aluno.scoreMesAtual ?? 10;
  const nivel  = aluno.statusBolsista.nivel;
  const fLabel = aluno.faixa?.label ?? '';
  const tLabel = aluno.tendencia?.label ?? '';

  if (nivel === 'alerta_pedagogico') return 0;
  if (nivel === 'risco')             return 5;
  if (fLabel === 'Crítico' && tLabel === 'Queda acentuada') return 10;
  if (fLabel === 'Crítico')          return 15;
  if (tLabel === 'Queda acentuada' && fLabel === 'Baixo desempenho') return 20;
  if (tLabel === 'Queda acentuada') return 25;
  if (nivel === 'atencao')           return 30;
  if (fLabel === 'Baixo desempenho') return 35 + Math.round(10 - score);
  if (fLabel === 'Abaixo da média' && tLabel === 'Queda') return 46;
  if (fLabel === 'Abaixo da média')  return 48;

  // Adequados e excelentes: ordenar por score decrescente
  return 50 + Math.round(10 - score);
}

// ─── Função principal ─────────────────────────────────────────────────────────

async function fetchMonitoramentoTurma(
  turma: string,
  mes:   number,
  ano:   number
): Promise<MonitoramentoResult> {
  const hoje = new Date().toISOString().split('T')[0];

  // Ranges de 3 meses: atual (m0), anterior (m1), dois atrás (m2)
  const meses = [0, 1, 2].map(i => {
    const base = subMonths(new Date(ano, mes - 1, 1), i);
    const s = startOfMonth(base);
    const e = endOfMonth(base);
    return {
      start:     s.toISOString(),
      end:       e.toISOString(),
      dateStart: format(s, 'yyyy-MM-dd'),
      dateEnd:   format(e, 'yyyy-MM-dd'),
    };
  });

  const [m0, m1, m2] = meses;

  // Range combinado dos 3 meses
  const rangeStart     = m2.start;
  const rangeEnd       = m0.end;
  const rangeDateStart = m2.dateStart;
  const rangeDateEnd   = m0.dateEnd;

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
        total: 0, porFaixa: {}, semDados: 0,
        totalBolsistas: 0, bolsistasOk: 0, bolsistasAtencao: 0,
        bolsistasRisco: 0, bolsistasAlerta: 0,
        metasEfetivas: RADAR_CONFIG.metas,
      },
    };
  }

  const emails     = perfis.map(p => p.email.toLowerCase().trim());
  const profileIds = perfis.map(p => p.id);
  const idToEmail  = new Map(perfis.map(p => [p.id, p.email.toLowerCase().trim()]));

  // 2. Queries paralelas — tudo no range de 3 meses
  const [
    bolsistasRes,
    redEnvRes, redSimRes, redExeRes,
    radarRes,
    presencasRes, aulasRes,
    lousasRes,
    microRes,
    guiasRes,
    repPRes, repFRes, repORes,
  ] = await Promise.all([
    supabase
      .from('assinaturas')
      .select('aluno_id')
      .in('aluno_id', profileIds)
      .eq('plano', 'Bolsista')
      .gte('data_validade', hoje),

    supabase.from('redacoes_enviadas')
      .select('email_aluno, data_envio')
      .in('email_aluno', emails)
      .eq('corrigida', true)
      .gte('data_envio', rangeStart)
      .lte('data_envio', rangeEnd),

    supabase.from('redacoes_simulado')
      .select('email_aluno, data_envio')
      .in('email_aluno', emails)
      .eq('corrigida', true)
      .gte('data_envio', rangeStart)
      .lte('data_envio', rangeEnd),

    supabase.from('redacoes_exercicio')
      .select('email_aluno, data_envio')
      .in('email_aluno', emails)
      .eq('corrigida', true)
      .gte('data_envio', rangeStart)
      .lte('data_envio', rangeEnd),

    supabase.from('radar_dados')
      .select('email_aluno, data_realizacao')
      .in('email_aluno', emails)
      .gte('data_realizacao', rangeDateStart)
      .lte('data_realizacao', rangeDateEnd),

    supabase.from('presenca_aulas')
      .select('email_aluno, aula_id, entrada_at')
      .in('email_aluno', emails)
      .not('entrada_at', 'is', null)
      .gte('entrada_at', rangeStart)
      .lte('entrada_at', rangeEnd),

    supabase.from('aulas_virtuais')
      .select('id, data_aula, aula_mae_id')
      .contains('turmas_autorizadas', [turma])
      .gte('data_aula', rangeDateStart)
      .lte('data_aula', rangeDateEnd),

    supabase.from('lousa_resposta')
      .select('email_aluno, lousa_id, submitted_at')
      .in('email_aluno', emails)
      .not('submitted_at', 'is', null)
      .gte('submitted_at', rangeStart)
      .lte('submitted_at', rangeEnd),

    (supabase as any).from('micro_progresso')
      .select('email_aluno, concluido_em')
      .in('email_aluno', emails)
      .eq('status', 'concluido')
      .gte('concluido_em', rangeStart)
      .lte('concluido_em', rangeEnd),

    (supabase as any).from('guias_tematicos_conclusoes')
      .select('aluno_email, guia_id, concluded_at')
      .in('aluno_email', emails)
      .gte('concluded_at', rangeStart)
      .lte('concluded_at', rangeEnd),

    supabase.from('repertorio_publicacoes')
      .select('autor_id, created_at')
      .in('autor_id', profileIds)
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd),

    supabase.from('repertorio_frases')
      .select('autor_id, created_at')
      .in('autor_id', profileIds)
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd),

    supabase.from('repertorio_obras')
      .select('autor_id, created_at')
      .in('autor_id', profileIds)
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd),
  ]);

  // 3. Sets e grupos para lookup rápido
  const bolsistasSet = new Set((bolsistasRes.data ?? []).map(b => b.aluno_id));

  const redEnvByEmail  = groupBy(redEnvRes.data ?? [], r => r.email_aluno);
  const redSimByEmail  = groupBy(redSimRes.data ?? [], r => r.email_aluno);
  const redExeByEmail  = groupBy(redExeRes.data ?? [], r => r.email_aluno);
  const radarByEmail   = groupBy(radarRes.data ?? [], r => r.email_aluno);
  const presencasByEmail = groupBy(presencasRes.data ?? [], r => r.email_aluno);
  const lousasByEmail  = groupBy(lousasRes.data ?? [], r => r.email_aluno);
  const microByEmail   = groupBy((microRes.data ?? []), r => r.email_aluno);
  const guiasData      = (guiasRes.data ?? []) as { aluno_email: string; guia_id: string; concluded_at: string }[];
  const guiasByEmail   = groupBy(guiasData, r => r.aluno_email);
  const repPByAutor    = groupBy(repPRes.data ?? [], r => r.autor_id);
  const repFByAutor    = groupBy(repFRes.data ?? [], r => r.autor_id);
  const repOByAutor    = groupBy(repORes.data ?? [], r => r.autor_id);

  // 4. Função: calcular métricas de um aluno num mês específico
  function getMetricasMes(
    email:   string,
    autorId: string,
    m:       typeof m0
  ): MetricasSimples {
    const redacoes =
      (redEnvByEmail.get(email)  ?? []).filter(r => inTs(r.data_envio, m.start, m.end)).length +
      (redSimByEmail.get(email)  ?? []).filter(r => inTs(r.data_envio, m.start, m.end)).length +
      (redExeByEmail.get(email)  ?? []).filter(r => inTs(r.data_envio, m.start, m.end)).length;

    const exercicios =
      (radarByEmail.get(email) ?? []).filter(r => inDate(r.data_realizacao, m.dateStart, m.dateEnd)).length;

    const presencasDoMes =
      (presencasByEmail.get(email) ?? []).filter(p => inTs(p.entrada_at, m.start, m.end));
    const presencasDistinct = new Set(presencasDoMes.map(p => p.aula_id)).size;

    const aulasDoMes = (aulasRes.data ?? []).filter(a => inDate(a.data_aula, m.dateStart, m.dateEnd));
    const aulasTotal = aulasDoMes.filter(a => !a.aula_mae_id).length;
    const frequencia = aulasTotal > 0
      ? Math.round((presencasDistinct / aulasTotal) * 100)
      : null;

    const lousasDoMes =
      (lousasByEmail.get(email) ?? []).filter(l => inTs(l.submitted_at, m.start, m.end));
    const lousas = new Set(lousasDoMes.map(l => l.lousa_id)).size;

    const microItens =
      (microByEmail.get(email) ?? []).filter(mi => inTs(mi.concluido_em, m.start, m.end)).length;

    const guiasDoMes =
      (guiasByEmail.get(email) ?? []).filter(g => inTs(g.concluded_at, m.start, m.end));
    const guias = new Set(guiasDoMes.map(g => g.guia_id)).size;

    const repertorio =
      (repPByAutor.get(autorId) ?? []).filter(r => inTs(r.created_at, m.start, m.end)).length +
      (repFByAutor.get(autorId) ?? []).filter(r => inTs(r.created_at, m.start, m.end)).length +
      (repOByAutor.get(autorId) ?? []).filter(r => inTs(r.created_at, m.start, m.end)).length;

    return { redacoes, frequencia, exercicios, lousas, microItens, repertorio, guias };
  }

  // 5. Calcular métricas de todos os alunos no mês atual (para ajuste de metas)
  const metricasMesAtualPorAluno = perfis.map(p => ({
    id:      p.id,
    email:   p.email.toLowerCase().trim(),
    metricas: getMetricasMes(p.email.toLowerCase().trim(), p.id, m0),
  }));

  // 6. Metas efetivas ajustadas pela oferta real da turma
  const metasEfetivas = calcularMetasEfetivas(metricasMesAtualPorAluno.map(a => a.metricas));

  // 7. Montar objetos AlunoMonitoramento
  const alunos: AlunoMonitoramento[] = perfis.map(p => {
    const email    = p.email.toLowerCase().trim();
    const autorId  = p.id;
    const apto     = alunoAptoParaAvaliar(p.data_aprovacao, mes, ano);

    const metricasM0 = metricasMesAtualPorAluno.find(a => a.id === p.id)!.metricas;
    const metricasM1 = getMetricasMes(email, autorId, m1);
    const metricasM2 = getMetricasMes(email, autorId, m2);

    const r0 = calcularScore(metricasM0, metasEfetivas);
    const r1 = calcularScore(metricasM1, metasEfetivas);
    const r2 = calcularScore(metricasM2, metasEfetivas);

    const scoreM0 = (!apto || r0.confianca === 'insuficiente') ? null : r0.score;
    const scoreM1 = r1.confianca === 'insuficiente' ? null : r1.score;
    const scoreM2 = r2.confianca === 'insuficiente' ? null : r2.score;

    const faixa    = scoreM0 !== null ? classificarFaixa(scoreM0) : null;
    const tendencia = scoreM0 !== null ? calcularTendencia(scoreM0, scoreM1) : null;
    const statusComposto = faixa
      ? gerarStatusComposto(faixa, tendencia as any)
      : 'Sem dados';

    const isBolsista    = bolsistasSet.has(p.id);
    const statusBolsista = calcularStatusBolsista(
      isBolsista,
      scoreM0 ?? 0,
      [scoreM2, scoreM1, scoreM0]
    );

    const parcial: AlunoMonitoramento = {
      id:             p.id,
      nome:           p.nome,
      email,
      dataAprovacao:  p.data_aprovacao,
      aptoParaAvaliar: apto,
      isBolsista,
      scoreMesAtual:    scoreM0,
      scoreMesAnterior: scoreM1,
      scoreMesDoisAtras: scoreM2,
      confiancaMesAtual: r0.confianca,
      faixa,
      tendencia:       tendencia as TendenciaInfo | null,
      statusComposto,
      statusBolsista,
      metricas:        metricasM0,
      prioridade:      0,
    };

    return { ...parcial, prioridade: calcularPrioridade(parcial) };
  });

  // 8. Ordenar por prioridade
  alunos.sort((a, b) => a.prioridade - b.prioridade || a.nome.localeCompare(b.nome));

  // 9. Resumo da turma
  const porFaixa: Record<string, number> = {};
  RADAR_CONFIG.faixas.forEach(f => { porFaixa[f.label] = 0; });

  let semDados = 0, totalBolsistas = 0, bolsistasOk = 0,
      bolsistasAtencao = 0, bolsistasRisco = 0, bolsistasAlerta = 0;

  for (const a of alunos) {
    if (!a.aptoParaAvaliar || a.confiancaMesAtual === 'insuficiente') {
      semDados++;
    } else if (a.faixa) {
      porFaixa[a.faixa.label] = (porFaixa[a.faixa.label] ?? 0) + 1;
    }

    if (a.isBolsista) {
      totalBolsistas++;
      switch (a.statusBolsista.nivel) {
        case 'ok':               bolsistasOk++;      break;
        case 'atencao':          bolsistasAtencao++; break;
        case 'risco':            bolsistasRisco++;   break;
        case 'alerta_pedagogico': bolsistasAlerta++; break;
      }
    }
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
      metasEfetivas,
    },
  };
}

// ─── Hook exportado ───────────────────────────────────────────────────────────

export function useMonitoramentoTurma(
  turma: string | null,
  mes:   number,
  ano:   number
) {
  return useQuery({
    queryKey:  ['monitoramentoTurma', turma, mes, ano],
    queryFn:   () => fetchMonitoramentoTurma(turma!, mes, ano),
    enabled:   !!turma,
    staleTime: 3 * 60 * 1000,
  });
}
