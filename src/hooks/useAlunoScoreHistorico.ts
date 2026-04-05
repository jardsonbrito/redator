import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { RADAR_CONFIG } from '@/config/radarConfig';
import {
  MetricasSimples,
  calcularScore,
  classificarFaixa,
  calcularTendencia,
} from '@/utils/radarScore';
import type { TendenciaInfo } from '@/hooks/useMonitoramentoTurma';
import type { FaixaConfig } from '@/config/radarConfig';

export interface ScoreMes {
  mes:       number;
  ano:       number;
  label:     string; // e.g. "jan/26"
  score:     number | null;
  confianca: 'total' | 'parcial' | 'insuficiente';
  metricas:  MetricasSimples;
  faixa:     FaixaConfig | null;
  tendencia: TendenciaInfo | null;
}

const N_MESES = 4;

async function fetchScoreHistorico(
  email: string,
  turma: string,
  mes:   number,
  ano:   number
): Promise<ScoreMes[]> {
  // Últimos N meses, do mais antigo ao mais recente
  const meses = Array.from({ length: N_MESES }, (_, i) => {
    const base = subMonths(new Date(ano, mes - 1, 1), N_MESES - 1 - i);
    const s    = startOfMonth(base);
    const e    = endOfMonth(base);
    return {
      mes:       base.getMonth() + 1,
      ano:       base.getFullYear(),
      label:     format(base, 'MMM/yy', { locale: ptBR }),
      start:     s.toISOString(),
      end:       e.toISOString(),
      dateStart: format(s, 'yyyy-MM-dd'),
      dateEnd:   format(e, 'yyyy-MM-dd'),
    };
  });

  const rangeStart     = meses[0].start;
  const rangeEnd       = meses[N_MESES - 1].end;
  const rangeDateStart = meses[0].dateStart;
  const rangeDateEnd   = meses[N_MESES - 1].dateEnd;

  // Busca o autor_id para queries de repertório
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  const autorId = profileData?.id ?? null;

  // Queries paralelas (range completo, particionar em JS por mês)
  const [
    redEnvRes, redSimRes, redExeRes,
    radarRes,
    presencasRes, aulasRes,
    lousasRes,
    microRes,
    guiasRes,
    repPRes, repFRes, repORes,
  ] = await Promise.all([
    // Score histórico do Radar mede engajamento: todas as enviadas
    supabase.from('redacoes_enviadas').select('data_envio')
      .eq('email_aluno', email)
      .gte('data_envio', rangeStart).lte('data_envio', rangeEnd),

    supabase.from('redacoes_simulado').select('data_envio')
      .eq('email_aluno', email)
      .gte('data_envio', rangeStart).lte('data_envio', rangeEnd),

    supabase.from('redacoes_exercicio').select('data_envio')
      .eq('email_aluno', email)
      .gte('data_envio', rangeStart).lte('data_envio', rangeEnd),

    supabase.from('radar_dados').select('data_realizacao')
      .eq('email_aluno', email)
      .gte('data_realizacao', rangeDateStart).lte('data_realizacao', rangeDateEnd),

    supabase.from('presenca_aulas').select('aula_id, entrada_at')
      .eq('email_aluno', email).not('entrada_at', 'is', null)
      .gte('entrada_at', rangeStart).lte('entrada_at', rangeEnd),

    supabase.from('aulas_virtuais').select('id, data_aula, aula_mae_id')
      .contains('turmas_autorizadas', [turma])
      .gte('data_aula', rangeDateStart).lte('data_aula', rangeDateEnd),

    supabase.from('lousa_resposta').select('lousa_id, submitted_at')
      .eq('email_aluno', email).not('submitted_at', 'is', null)
      .gte('submitted_at', rangeStart).lte('submitted_at', rangeEnd),

    (supabase as any).from('micro_progresso').select('concluido_em')
      .eq('email_aluno', email).eq('status', 'concluido')
      .gte('concluido_em', rangeStart).lte('concluido_em', rangeEnd),

    (supabase as any).from('guias_tematicos_conclusoes').select('guia_id, concluded_at')
      .eq('aluno_email', email)
      .gte('concluded_at', rangeStart).lte('concluded_at', rangeEnd),

    autorId
      ? supabase.from('repertorio_publicacoes').select('created_at')
          .eq('autor_id', autorId).gte('created_at', rangeStart).lte('created_at', rangeEnd)
      : Promise.resolve({ data: [] as { created_at: string }[], error: null }),

    autorId
      ? supabase.from('repertorio_frases').select('created_at')
          .eq('autor_id', autorId).gte('created_at', rangeStart).lte('created_at', rangeEnd)
      : Promise.resolve({ data: [] as { created_at: string }[], error: null }),

    autorId
      ? supabase.from('repertorio_obras').select('created_at')
          .eq('autor_id', autorId).gte('created_at', rangeStart).lte('created_at', rangeEnd)
      : Promise.resolve({ data: [] as { created_at: string }[], error: null }),
  ]);

  const { metas } = RADAR_CONFIG;

  // Particionar por mês e calcular score
  return meses.map((m, idx) => {
    const inTs   = (d?: string | null) => !!d && d >= m.start && d <= m.end;
    const inDate = (d?: string | null) => !!d && d >= m.dateStart && d <= m.dateEnd;

    const redacoes =
      (redEnvRes.data ?? []).filter(r => inTs(r.data_envio)).length +
      (redSimRes.data ?? []).filter(r => inTs(r.data_envio)).length +
      (redExeRes.data ?? []).filter(r => inTs(r.data_envio)).length;

    const exercicios = (radarRes.data ?? []).filter(r => inDate(r.data_realizacao)).length;

    const presencasDoMes = (presencasRes.data ?? []).filter(p => inTs(p.entrada_at));
    const presencasDistinct = new Set(presencasDoMes.map(p => p.aula_id)).size;
    const aulasDoMes  = (aulasRes.data ?? []).filter(a => inDate(a.data_aula));
    const aulasTotal  = aulasDoMes.filter(a => !a.aula_mae_id).length;
    const frequencia  = aulasTotal > 0 ? Math.round((presencasDistinct / aulasTotal) * 100) : null;

    const lousasDoMes = (lousasRes.data ?? []).filter(l => inTs(l.submitted_at));
    const lousas      = new Set(lousasDoMes.map(l => l.lousa_id)).size;

    const microItens = ((microRes.data ?? []) as { concluido_em: string }[]).filter(mi => inTs(mi.concluido_em)).length;

    const guiasDoMes = ((guiasRes.data ?? []) as { guia_id: string; concluded_at: string }[]).filter(g => inTs(g.concluded_at));
    const guias      = new Set(guiasDoMes.map(g => g.guia_id)).size;

    const repertorio =
      (repPRes.data ?? []).filter(r => inTs(r.created_at)).length +
      (repFRes.data ?? []).filter(r => inTs(r.created_at)).length +
      (repORes.data ?? []).filter(r => inTs(r.created_at)).length;

    const metricas: MetricasSimples = { redacoes, frequencia, exercicios, lousas, microItens, repertorio, guias };
    const { score, confianca }      = calcularScore(metricas, metas);
    const scoreValido               = confianca !== 'insuficiente' ? score : null;
    const faixa                     = scoreValido !== null ? classificarFaixa(scoreValido) : null;

    return {
      mes:       m.mes,
      ano:       m.ano,
      label:     m.label,
      score:     scoreValido,
      confianca,
      metricas,
      faixa,
      tendencia: null, // preenchido abaixo
    };
  }).map((item, idx, arr) => {
    const anterior = idx > 0 ? arr[idx - 1].score : null;
    return {
      ...item,
      tendencia: item.score !== null
        ? calcularTendencia(item.score, anterior) as TendenciaInfo | null
        : null,
    };
  });
}

export function useAlunoScoreHistorico(
  email: string | null,
  turma: string | null,
  mes:   number,
  ano:   number
) {
  return useQuery({
    queryKey:  ['alunoScoreHistorico', email, turma, mes, ano],
    queryFn:   () => fetchScoreHistorico(email!, turma!, mes, ano),
    enabled:   !!email && !!turma,
    staleTime: 3 * 60 * 1000,
  });
}
