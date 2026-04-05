import { differenceInDays, endOfMonth, parseISO } from 'date-fns';
import { RADAR_CONFIG, FaixaConfig, TendenciaConfig } from '@/config/radarConfig';

// ─── Tipos exportados ────────────────────────────────────────────────────────

export interface MetricasSimples {
  redacoes:   number;
  frequencia: number | null; // 0-100 ou null (sem aulas no período)
  exercicios: number;
  lousas:     number;
  microItens: number;
  repertorio: number;
  guias:      number;
}

export interface MetasEfetivas {
  redacoes:   number;
  exercicios: number;
  lousas:     number;
  microItens: number;
  repertorio: number;
  guias:      number;
}

export interface ScoreResult {
  score:     number; // 0.0 – 10.0
  confianca: 'total' | 'parcial' | 'insuficiente';
}

export interface TendenciaInfo extends TendenciaConfig {
  delta: number;
}

export interface StatusBolsista {
  isBolsista: boolean;
  nivel: 'ok' | 'atencao' | 'risco' | 'alerta_pedagogico' | null;
  label: string | null;
  cor:   string | null;
}

// ─── Normalização ─────────────────────────────────────────────────────────────

function normalizarMetrica(valor: number, meta: number): number {
  if (meta <= 0) return 10; // sem meta → não penaliza
  return Math.min((valor / meta) * 10, 10);
}

function normalizarFrequencia(taxa: number | null): number {
  if (taxa === null) return -1; // sinaliza "sem dados de aulas"
  return Math.min(taxa / 10, 10);
}

// ─── Score ponderado ──────────────────────────────────────────────────────────

export function calcularScore(
  metricas: MetricasSimples,
  metas: MetasEfetivas
): ScoreResult {
  const { pesos } = RADAR_CONFIG;

  const notas: Record<string, number> = {
    redacoes:   normalizarMetrica(metricas.redacoes,   metas.redacoes),
    frequencia: normalizarFrequencia(metricas.frequencia),
    exercicios: normalizarMetrica(metricas.exercicios, metas.exercicios),
    lousas:     normalizarMetrica(metricas.lousas,     metas.lousas),
    microItens: normalizarMetrica(metricas.microItens, metas.microItens),
    repertorio: normalizarMetrica(metricas.repertorio, metas.repertorio),
    guias:      normalizarMetrica(metricas.guias,      metas.guias),
  };

  // Excluir métricas marcadas como "sem dados" (-1)
  const validas      = Object.entries(notas).filter(([, v]) => v >= 0);
  const comAtividade = validas.filter(([, v]) => v > 0);

  // Confiança: frequência não-null (aulas no período) já é dado suficiente,
  // mesmo que o aluno não tenha comparecido a nenhuma
  const temFrequencia = metricas.frequencia !== null;

  const confianca: ScoreResult['confianca'] =
    comAtividade.length >= 3 ? 'total' :
    (comAtividade.length >= 1 || temFrequencia) ? 'parcial' :
    'insuficiente';

  let somaPesos     = 0;
  let somaPonderada = 0;

  for (const [chave, nota] of validas) {
    const peso = pesos[chave as keyof typeof pesos] ?? 0;
    somaPesos     += peso;
    somaPonderada += nota * peso;
  }

  const score = somaPesos > 0
    ? Math.round((somaPonderada / somaPesos) * 10) / 10
    : 0;

  return { score, confianca };
}

// ─── Classificação de faixa ───────────────────────────────────────────────────

export function classificarFaixa(score: number): FaixaConfig {
  return (
    RADAR_CONFIG.faixas.find(f => score >= f.min && score <= f.max) ??
    RADAR_CONFIG.faixas[RADAR_CONFIG.faixas.length - 1]
  );
}

// ─── Tendência ────────────────────────────────────────────────────────────────

export function calcularTendencia(
  scoreAtual:    number,
  scoreAnterior: number | null
): TendenciaInfo | null {
  if (scoreAnterior === null) return null;

  const delta = Math.round((scoreAtual - scoreAnterior) * 10) / 10;

  // tendencias está ordenada do maior minDelta para o menor
  const found =
    RADAR_CONFIG.tendencias.find(t => delta >= t.minDelta) ??
    RADAR_CONFIG.tendencias[RADAR_CONFIG.tendencias.length - 1];

  return { ...found, delta };
}

// ─── Status composto ─────────────────────────────────────────────────────────

export function gerarStatusComposto(
  faixa:    FaixaConfig,
  tendencia: TendenciaInfo | null
): string {
  if (!tendencia) return faixa.label;

  const textos: Record<string, string> = {
    'Evolução':        'em evolução',
    'Estável':         'estável',
    'Queda':           'em queda',
    'Queda acentuada': 'em queda acentuada',
  };

  return `${faixa.label}, ${textos[tendencia.label] ?? tendencia.label}`;
}

// ─── Status bolsista ─────────────────────────────────────────────────────────

export function calcularStatusBolsista(
  isBolsista:    boolean,
  scoreAtual:    number,
  historico:     (number | null)[] // meses ordenados do mais antigo ao mais recente (inclui atual)
): StatusBolsista {
  if (!isBolsista) return { isBolsista: false, nivel: null, label: null, cor: null };

  const { bolsista } = RADAR_CONFIG;

  // Queda consecutiva: verifica as últimas N+1 transições
  const validos = historico.filter((s): s is number => s !== null);
  let quedaConsecutiva = false;
  if (validos.length >= bolsista.mesesQuedaAlerta + 1) {
    const ultimos = validos.slice(-(bolsista.mesesQuedaAlerta + 1));
    quedaConsecutiva = ultimos.every((s, i) => i === 0 || s < ultimos[i - 1]);
  }

  if (quedaConsecutiva)
    return { isBolsista: true, nivel: 'alerta_pedagogico', label: 'Alerta Pedagógico', cor: '#7c3aed' };
  if (scoreAtual < bolsista.scoreRisco)
    return { isBolsista: true, nivel: 'risco', label: 'Bolsista em Risco', cor: '#ef4444' };
  if (scoreAtual < bolsista.scoreAtencao)
    return { isBolsista: true, nivel: 'atencao', label: 'Bolsista: Atenção', cor: '#f59e0b' };

  return { isBolsista: true, nivel: 'ok', label: 'Bolsista', cor: '#d97706' };
}

// ─── Metas efetivas (ajuste por oferta real da turma) ────────────────────────

export function calcularMetasEfetivas(
  metricasDaTurma: MetricasSimples[]
): MetasEfetivas {
  const config = RADAR_CONFIG.metas;

  function metaEfetiva(
    fn: (m: MetricasSimples) => number,
    metaConfig: number
  ): number {
    if (metricasDaTurma.length === 0) return metaConfig;
    const maxReal = Math.max(...metricasDaTurma.map(fn), 0);
    // Se nenhum aluno atingiu 50% da meta → ajustar para o máximo real
    if (maxReal > 0 && maxReal < metaConfig * 0.5) return maxReal;
    return metaConfig;
  }

  return {
    redacoes:   metaEfetiva(m => m.redacoes,   config.redacoes),
    exercicios: metaEfetiva(m => m.exercicios, config.exercicios),
    lousas:     metaEfetiva(m => m.lousas,     config.lousas),
    microItens: metaEfetiva(m => m.microItens, config.microItens),
    repertorio: metaEfetiva(m => m.repertorio, config.repertorio),
    guias:      metaEfetiva(m => m.guias,      config.guias),
  };
}

// ─── Verificação: aluno apto para avaliação no período ───────────────────────

export function alunoAptoParaAvaliar(
  dataAprovacao: string | null,
  mes:           number,
  ano:           number
): boolean {
  if (!dataAprovacao) return true;
  try {
    const aprovacao = parseISO(dataAprovacao);
    const fimMes    = endOfMonth(new Date(ano, mes - 1, 1));
    const dias      = differenceInDays(fimMes, aprovacao);
    return dias >= RADAR_CONFIG.robustez.diasMinimoNaTurma;
  } catch {
    return true;
  }
}

// ─── Alertas automáticos ─────────────────────────────────────────────────────

export interface Alerta {
  tipo:  'alerta' | 'info' | 'positivo';
  texto: string;
}

export function gerarAlertas(
  historico:  { score: number | null; metricas: MetricasSimples }[],
  isBolsista: boolean
): Alerta[] {
  if (historico.length === 0) return [];

  const alertas: Alerta[] = [];
  const recente  = historico[historico.length - 1];
  const anterior = historico.length >= 2 ? historico[historico.length - 2] : null;

  // Queda consecutiva
  const scoresValidos = historico.map(h => h.score).filter((s): s is number => s !== null);
  if (scoresValidos.length >= 3) {
    const ultimos3 = scoresValidos.slice(-3);
    if (ultimos3[2] < ultimos3[1] && ultimos3[1] < ultimos3[0]) {
      alertas.push({ tipo: 'alerta', texto: 'Em queda há 3 meses consecutivos' });
    } else if (scoresValidos.length >= 2 && scoresValidos[scoresValidos.length - 1] < scoresValidos[scoresValidos.length - 2]) {
      const meses2 = scoresValidos.slice(-2);
      if (meses2[1] < meses2[0]) {
        alertas.push({ tipo: 'alerta', texto: 'Queda em relação ao mês anterior' });
      }
    }
  } else if (scoresValidos.length === 2 && scoresValidos[1] < scoresValidos[0]) {
    alertas.push({ tipo: 'alerta', texto: 'Queda em relação ao mês anterior' });
  }

  // Score crítico
  if (recente.score !== null && recente.score < 3) {
    alertas.push({ tipo: 'alerta', texto: 'Score crítico no período atual' });
  }

  // Sem redações
  if (recente.metricas.redacoes === 0) {
    alertas.push({ tipo: 'alerta', texto: 'Nenhuma redação enviada no período' });
  }

  // Frequência baixa
  if (recente.metricas.frequencia !== null && recente.metricas.frequencia < 40) {
    alertas.push({ tipo: 'alerta', texto: `Frequência baixa: ${recente.metricas.frequencia}%` });
  }

  // Melhora significativa
  if (anterior?.score !== null && recente.score !== null && anterior !== null) {
    const delta = recente.score - (anterior.score ?? 0);
    if (delta >= 2) {
      alertas.push({ tipo: 'positivo', texto: `Melhora de ${delta.toFixed(1)} pontos vs mês anterior` });
    }
  }

  // Crescimento consistente (últimos 3+)
  if (scoresValidos.length >= 3) {
    const todosCrescendo = scoresValidos
      .slice(-3)
      .every((s, i, arr) => i === 0 || s >= arr[i - 1]);
    if (todosCrescendo) {
      alertas.push({ tipo: 'positivo', texto: 'Crescimento consistente nos últimos meses' });
    }
  }

  // Bolsista
  if (isBolsista && recente.score !== null) {
    if (recente.score < RADAR_CONFIG.bolsista.scoreRisco) {
      alertas.push({ tipo: 'alerta', texto: 'Bolsista abaixo do desempenho mínimo (< 5,0)' });
    } else if (recente.score < RADAR_CONFIG.bolsista.scoreAtencao) {
      alertas.push({ tipo: 'alerta', texto: 'Bolsista com score abaixo de 7,0 — requer atenção' });
    }
  }

  // Sem atividade em micro
  if (recente.metricas.microItens === 0 && recente.metricas.redacoes === 0) {
    alertas.push({ tipo: 'info', texto: 'Sem atividade registrada no período' });
  }

  // Deduplicar e limitar
  return alertas.slice(0, 5);
}
