import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  calcularScoreRedacoes,
  calcularScorePresenca,
  calcularScoreComOferta,
  calcularScoreSemOferta,
  calcularScoreGeral,
} from '@/utils/radarScore';

export interface ScoreMes {
  mes: number;
  ano: number;
  label: string; // e.g. "jan/26"

  // Scores por métrica (0-100)
  redacoes: number | null;
  presenca: number | null;
  exercicios: number | null;
  lousa: number | null;
  micro: number | null;
  guia: number | null;
  repertorio: number | null;

  // Valores brutos
  valoresRedacoes: { simulados: number; regulares: number };
  valoresPresenca: { presencas: number; aulasOfertadas: number };
  valoresExercicios: { realizados: number; oferta: number };
  valoresLousa: { concluidas: number; oferta: number };
  valoresMicro: { concluidos: number; oferta: number };
  valoresGuia: { concluidos: number; oferta: number };
  valoresRepertorio: { itens: number };

  // Score geral (0-10)
  scoreGeral: number | null;
}

const N_MESES = 4;

async function fetchScoreHistorico(
  email: string,
  turma: string,
  mes: number,
  ano: number
): Promise<ScoreMes[]> {
  // Últimos N meses, do mais antigo ao mais recente
  const meses = Array.from({ length: N_MESES }, (_, i) => {
    const base = subMonths(new Date(ano, mes - 1, 1), N_MESES - 1 - i);
    const s = startOfMonth(base);
    const e = endOfMonth(base);
    return {
      mes: base.getMonth() + 1,
      ano: base.getFullYear(),
      label: format(base, 'MMM/yy', { locale: ptBR }),
      start: s.toISOString(),
      end: e.toISOString(),
      dateStart: format(s, 'yyyy-MM-dd'),
      dateEnd: format(e, 'yyyy-MM-dd'),
    };
  });

  const rangeStart = meses[0].start;
  const rangeEnd = meses[N_MESES - 1].end;
  const rangeDateStart = meses[0].dateStart;
  const rangeDateEnd = meses[N_MESES - 1].dateEnd;

  // Busca o autor_id para queries de repertório
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  const autorId = profileData?.id ?? null;

  // Queries paralelas (range completo, particionar em JS por mês)
  const [
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
    // Redações
    supabase
      .from('redacoes_enviadas')
      .select('data_envio')
      .eq('email_aluno', email)
      .gte('data_envio', rangeStart)
      .lte('data_envio', rangeEnd),

    supabase
      .from('redacoes_simulado')
      .select('data_envio')
      .eq('email_aluno', email)
      .gte('data_envio', rangeStart)
      .lte('data_envio', rangeEnd),

    supabase
      .from('redacoes_exercicio')
      .select('data_envio')
      .eq('email_aluno', email)
      .gte('data_envio', rangeStart)
      .lte('data_envio', rangeEnd),

    // Exercícios Radar
    supabase
      .from('radar_dados')
      .select('data_realizacao')
      .eq('email_aluno', email)
      .gte('data_realizacao', rangeDateStart)
      .lte('data_realizacao', rangeDateEnd),

    // Presenças
    supabase
      .from('presenca_aulas')
      .select('aula_id, entrada_at')
      .eq('email_aluno', email)
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
      .select('lousa_id, submitted_at')
      .eq('email_aluno', email)
      .not('submitted_at', 'is', null)
      .gte('submitted_at', rangeStart)
      .lte('submitted_at', rangeEnd),

    // Lousas disponíveis
    supabase
      .from('lousa')
      .select('id, created_at')
      .contains('turmas_autorizadas', [turma])
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd),

    // Micro concluídos
    (supabase as any)
      .from('micro_progresso')
      .select('concluido_em')
      .eq('email_aluno', email)
      .eq('status', 'concluido')
      .gte('concluido_em', rangeStart)
      .lte('concluido_em', rangeEnd),

    // Micro disponíveis
    (supabase as any)
      .from('micro_topicos')
      .select('id, created_at')
      .eq('status', 'published')
      .lte('created_at', rangeEnd),

    // Guias concluídos
    (supabase as any)
      .from('guias_tematicos_conclusoes')
      .select('guia_id, concluded_at')
      .eq('aluno_email', email)
      .gte('concluded_at', rangeStart)
      .lte('concluded_at', rangeEnd),

    // Guias disponíveis
    (supabase as any)
      .from('guias_tematicos')
      .select('id, created_at')
      .eq('status', 'published')
      .lte('created_at', rangeEnd),

    // Repertório
    autorId
      ? supabase
          .from('repertorio_publicacoes')
          .select('created_at')
          .eq('autor_id', autorId)
          .gte('created_at', rangeStart)
          .lte('created_at', rangeEnd)
      : Promise.resolve({ data: [] as { created_at: string }[], error: null }),

    autorId
      ? supabase
          .from('repertorio_frases')
          .select('created_at')
          .eq('autor_id', autorId)
          .gte('created_at', rangeStart)
          .lte('created_at', rangeEnd)
      : Promise.resolve({ data: [] as { created_at: string }[], error: null }),

    autorId
      ? supabase
          .from('repertorio_obras')
          .select('created_at')
          .eq('autor_id', autorId)
          .gte('created_at', rangeStart)
          .lte('created_at', rangeEnd)
      : Promise.resolve({ data: [] as { created_at: string }[], error: null }),
  ]);

  // Particionar por mês e calcular scores
  const scoresPorMes = meses.map((m, idx) => {
    const inTs = (d?: string | null) => !!d && d >= m.start && d <= m.end;
    const inDate = (d?: string | null) => !!d && d >= m.dateStart && d <= m.dateEnd;

    // Redações
    const redEnv = (redEnvRes.data ?? []).filter(r => inTs(r.data_envio)).length;
    const redExe = (redExeRes.data ?? []).filter(r => inTs(r.data_envio)).length;
    const redSim = (redSimRes.data ?? []).filter(r => inTs(r.data_envio)).length;

    const simulados = redSim;
    const regulares = redEnv + redExe;

    // Exercícios
    const exercicios = (radarRes.data ?? []).filter(r => inDate(r.data_realizacao)).length;
    const exerciciosOferta = 3; // Meta fixa

    // Presenças
    const presencasDoMes = (presencasRes.data ?? []).filter(p => inTs(p.entrada_at));
    const presencasDistinct = new Set(presencasDoMes.map(p => p.aula_id)).size;
    const aulasDoMes = (aulasRes.data ?? []).filter(a => inDate(a.data_aula));
    const aulasOfertadas = aulasDoMes.filter(a => !a.aula_mae_id).length;

    // Lousas
    const lousasDoMes = (lousasRes.data ?? []).filter(l => inTs(l.submitted_at));
    const lousas = new Set(lousasDoMes.map(l => l.lousa_id)).size;
    const lousasDisponiveisDoMes = (lousasDisponiveisRes.data ?? []).filter(l => inTs(l.created_at)).length;

    // Micro
    const microItens = ((microRes.data ?? []) as { concluido_em: string }[]).filter(mi => inTs(mi.concluido_em))
      .length;
    const microDisponiveisDoMes = (microDisponiveisRes.data ?? []).filter(
      mt => mt.created_at && mt.created_at <= m.end
    ).length;

    // Guias
    const guiasDoMes = ((guiasRes.data ?? []) as { guia_id: string; concluded_at: string }[]).filter(g =>
      inTs(g.concluded_at)
    );
    const guias = new Set(guiasDoMes.map(g => g.guia_id)).size;
    const guiasDisponiveisDoMes = (guiasDisponiveisRes.data ?? []).filter(
      gt => gt.created_at && gt.created_at <= m.end
    ).length;

    // Repertório
    const repertorio =
      (repPRes.data ?? []).filter(r => inTs(r.created_at)).length +
      (repFRes.data ?? []).filter(r => inTs(r.created_at)).length +
      (repORes.data ?? []).filter(r => inTs(r.created_at)).length;

    // Valores do mês anterior (se existir)
    const mesAnterior = idx > 0 ? scoresPorMes[idx - 1] : null;

    // Calcular scores usando as funções
    const scoreRedacoes = calcularScoreRedacoes(
      simulados,
      regulares,
      mesAnterior?.valoresRedacoes.simulados ?? null,
      mesAnterior?.valoresRedacoes.regulares ?? null
    );

    const scorePresenca = calcularScorePresenca(
      presencasDistinct,
      aulasOfertadas,
      mesAnterior?.valoresPresenca.presencas ?? null,
      mesAnterior?.valoresPresenca.aulasOfertadas ?? null
    );

    const scoreExercicios = calcularScoreComOferta(
      exercicios,
      exerciciosOferta,
      mesAnterior?.valoresExercicios.realizados ?? null,
      mesAnterior?.valoresExercicios.oferta ?? null
    );

    const scoreLousa = calcularScoreComOferta(
      lousas,
      lousasDisponiveisDoMes,
      mesAnterior?.valoresLousa.concluidas ?? null,
      mesAnterior?.valoresLousa.oferta ?? null
    );

    const scoreMicro = calcularScoreComOferta(
      microItens,
      microDisponiveisDoMes,
      mesAnterior?.valoresMicro.concluidos ?? null,
      mesAnterior?.valoresMicro.oferta ?? null
    );

    const scoreGuia = calcularScoreComOferta(
      guias,
      guiasDisponiveisDoMes,
      mesAnterior?.valoresGuia.concluidos ?? null,
      mesAnterior?.valoresGuia.oferta ?? null
    );

    const scoreRepertorio = calcularScoreSemOferta(
      repertorio,
      mesAnterior?.valoresRepertorio.itens ?? null
    );

    // Score geral
    const scoreGeral = calcularScoreGeral({
      redacoes: scoreRedacoes.score,
      presenca: scorePresenca.score,
      exercicios: scoreExercicios.score,
      lousa: scoreLousa.score,
      micro: scoreMicro.score,
      guia: scoreGuia.score,
      repertorio: scoreRepertorio.score,
    });

    return {
      mes: m.mes,
      ano: m.ano,
      label: m.label,
      redacoes: scoreRedacoes.score,
      presenca: scorePresenca.score,
      exercicios: scoreExercicios.score,
      lousa: scoreLousa.score,
      micro: scoreMicro.score,
      guia: scoreGuia.score,
      repertorio: scoreRepertorio.score,
      valoresRedacoes: { simulados, regulares },
      valoresPresenca: { presencas: presencasDistinct, aulasOfertadas },
      valoresExercicios: { realizados: exercicios, oferta: exerciciosOferta },
      valoresLousa: { concluidas: lousas, oferta: lousasDisponiveisDoMes },
      valoresMicro: { concluidos: microItens, oferta: microDisponiveisDoMes },
      valoresGuia: { concluidos: guias, oferta: guiasDisponiveisDoMes },
      valoresRepertorio: { itens: repertorio },
      scoreGeral,
    };
  });

  return scoresPorMes;
}

export function useAlunoScoreHistorico(
  email: string | null,
  turma: string | null,
  mes: number,
  ano: number
) {
  return useQuery({
    queryKey: ['alunoScoreHistorico', email, turma, mes, ano],
    queryFn: () => fetchScoreHistorico(email!, turma!, mes, ano),
    enabled: !!email && !!turma,
    staleTime: 3 * 60 * 1000,
  });
}
