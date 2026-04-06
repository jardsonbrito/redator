import { differenceInDays, endOfMonth, parseISO } from 'date-fns';
import { RADAR_CONFIG, FaixaConfig, TendenciaConfig } from '@/config/radarConfig';

// ─── Tipos exportados ────────────────────────────────────────────────────────

export interface Evolucao {
  tipo: 'evolucao_forte' | 'evolucao' | 'estavel' | 'queda' | 'queda_forte' | 'sem_dados';
  label: string;
  delta: number | null;
  icone: string;
  cor: string;
}

export interface ScoreMetrica {
  score: number | null;          // 0-100
  valorAtual: number;            // valor bruto (ex: 3 redações)
  valorAnterior: number | null;  // valor do mês anterior
  ofertaAtual: number | null;    // total ofertado (null se não aplicável)
  ofertaAnterior: number | null;
  faixa: FaixaConfig | null;     // classificação por percentual
  evolucao: Evolucao;             // comparação com mês anterior
}

export interface ScoreRedacoes extends ScoreMetrica {
  simulados: number;
  regulares: number;
  scoreSimulado: number | null;
  scoreRegulares: number | null;
}

export interface ScorePresenca extends ScoreMetrica {
  presencas: number;
  aulasOfertadas: number;
  taxa: number | null;  // percentual
}

export interface ValoresMetricas {
  // Valores atuais
  redacoesSimulado: number;
  redacoesRegulares: number;
  presencas: number;
  aulasOfertadas: number;
  exercicios: number;
  exerciciosOferta: number;
  lousas: number;
  lousasOferta: number;
  micro: number;
  microOferta: number;
  guias: number;
  guiasOferta: number;
  repertorio: number;
}

export interface ValoresMetricasAnterior {
  // Valores mês anterior
  redacoesSimulado: number | null;
  redacoesRegulares: number | null;
  presencas: number | null;
  aulasOfertadas: number | null;
  exercicios: number | null;
  exerciciosOferta: number | null;
  lousas: number | null;
  lousasOferta: number | null;
  micro: number | null;
  microOferta: number | null;
  guias: number | null;
  guiasOferta: number | null;
  repertorio: number | null;
}

export interface StatusBolsista {
  isBolsista: boolean;
  nivel: 'ok' | 'atencao' | 'risco' | 'alerta' | null;
  label: string;
  cor: string;
  alertas: string[];
}

// ─── Classificação por percentual ────────────────────────────────────────────

export function classificarPorPercentual(percentual: number | null): FaixaConfig | null {
  if (percentual === null) return null;

  return (
    RADAR_CONFIG.faixas.find(f => percentual >= f.min && percentual <= f.max) ??
    RADAR_CONFIG.faixas[RADAR_CONFIG.faixas.length - 1]
  );
}

export function classificarScoreGeral(score: number | null): FaixaConfig | null {
  if (score === null) return null;

  return (
    RADAR_CONFIG.faixasScoreGeral.find(f => score >= f.min && score <= f.max) ??
    RADAR_CONFIG.faixasScoreGeral[RADAR_CONFIG.faixasScoreGeral.length - 1]
  );
}

// ─── Comparação intraindividual (evolução) ────────────────────────────────────

export function compararScores(
  scoreAtual: number | null,
  scoreAnterior: number | null
): Evolucao {
  if (scoreAtual === null || scoreAnterior === null) {
    return {
      tipo: 'sem_dados',
      label: 'Sem dados para comparar',
      delta: null,
      icone: '—',
      cor: '#9ca3af',
    };
  }

  const delta = scoreAtual - scoreAnterior;

  // Verificar em ordem decrescente de minDelta
  const config = RADAR_CONFIG.evolucao.find(e => delta >= e.minDelta);

  if (!config) {
    return {
      tipo: 'queda_forte',
      label: 'Queda significativa',
      delta,
      icone: '▼▼',
      cor: '#ef4444',
    };
  }

  const tipoMap: Record<string, Evolucao['tipo']> = {
    'Evolução significativa': 'evolucao_forte',
    'Evoluiu': 'evolucao',
    'Manteve': 'estavel',
    'Caiu': 'queda',
    'Queda significativa': 'queda_forte',
  };

  return {
    tipo: tipoMap[config.label] ?? 'sem_dados',
    label: config.label,
    delta,
    icone: config.icone,
    cor: config.cor,
  };
}

// ─── Cálculo de Score de Redações ────────────────────────────────────────────

export function calcularScoreRedacoes(
  simuladosAtual: number,
  regularesAtual: number,
  simuladosAnterior: number | null,
  regularesAnterior: number | null
): ScoreRedacoes {
  const { pesoSimulado, pesoRegulares } = RADAR_CONFIG.redacoes;

  // Score simulado (binário: fez ou não fez)
  const scoreSimuladoAtual = simuladosAtual >= 1 ? 100 : 0;
  const scoreSimuladoAnterior = simuladosAnterior !== null && simuladosAnterior >= 1 ? 100 : 0;

  // Score regulares (comparação intraindividual)
  let scoreRegularesAtual: number | null = null;
  let scoreRegularesAnterior: number | null = null;

  if (regularesAtual === 0 && (regularesAnterior === null || regularesAnterior === 0)) {
    scoreRegularesAtual = null;  // Sem dados
  } else if (regularesAnterior === null || regularesAnterior === 0) {
    scoreRegularesAtual = regularesAtual > 0 ? 100 : 0;
  } else {
    const percentual = (regularesAtual / regularesAnterior) * 100;
    scoreRegularesAtual = Math.min(percentual, 100);
    scoreRegularesAnterior = 100;  // Base de comparação
  }

  // Score final de redações
  let scoreFinal: number | null;

  if (scoreRegularesAtual === null) {
    scoreFinal = scoreSimuladoAtual;
  } else {
    scoreFinal = (scoreSimuladoAtual * pesoSimulado) + (scoreRegularesAtual * pesoRegulares);
  }

  // Score anterior
  let scoreFinalAnterior: number | null = null;
  if (simuladosAnterior !== null && regularesAnterior !== null) {
    if (scoreRegularesAnterior === null) {
      scoreFinalAnterior = scoreSimuladoAnterior;
    } else {
      scoreFinalAnterior = (scoreSimuladoAnterior * pesoSimulado) + (scoreRegularesAnterior * pesoRegulares);
    }
  }

  const faixa = classificarPorPercentual(scoreFinal);
  const evolucao = compararScores(scoreFinal, scoreFinalAnterior);

  return {
    score: scoreFinal,
    valorAtual: simuladosAtual + regularesAtual,
    valorAnterior: simuladosAnterior !== null && regularesAnterior !== null
      ? simuladosAnterior + regularesAnterior
      : null,
    ofertaAtual: null,  // Redações não têm oferta fixa
    ofertaAnterior: null,
    faixa,
    evolucao,
    simulados: simuladosAtual,
    regulares: regularesAtual,
    scoreSimulado: scoreSimuladoAtual,
    scoreRegulares: scoreRegularesAtual,
  };
}

// ─── Cálculo de Score de Presença ────────────────────────────────────────────

export function calcularScorePresenca(
  presencasAtual: number,
  aulasOfertadasAtual: number,
  presencasAnterior: number | null,
  aulasOfertadasAnterior: number | null
): ScorePresenca {
  // Score atual
  let scoreAtual: number | null = null;
  let taxaAtual: number | null = null;

  if (aulasOfertadasAtual === 0) {
    scoreAtual = null;
  } else {
    taxaAtual = (presencasAtual / aulasOfertadasAtual) * 100;
    scoreAtual = taxaAtual;
  }

  // Score anterior
  let scoreAnterior: number | null = null;

  if (aulasOfertadasAnterior !== null && aulasOfertadasAnterior > 0 && presencasAnterior !== null) {
    scoreAnterior = (presencasAnterior / aulasOfertadasAnterior) * 100;
  }

  const faixa = classificarPorPercentual(scoreAtual);
  const evolucao = compararScores(scoreAtual, scoreAnterior);

  return {
    score: scoreAtual,
    valorAtual: presencasAtual,
    valorAnterior: presencasAnterior,
    ofertaAtual: aulasOfertadasAtual,
    ofertaAnterior: aulasOfertadasAnterior,
    faixa,
    evolucao,
    presencas: presencasAtual,
    aulasOfertadas: aulasOfertadasAtual,
    taxa: taxaAtual,
  };
}

// ─── Cálculo de Score Genérico (com oferta) ──────────────────────────────────

export function calcularScoreComOferta(
  realizadosAtual: number,
  ofertaAtual: number,
  realizadosAnterior: number | null,
  ofertaAnterior: number | null
): ScoreMetrica {
  // Score atual
  let scoreAtual: number | null = null;

  if (ofertaAtual === 0) {
    scoreAtual = null;  // Sem oferta, não penalizar
  } else {
    const percentual = (realizadosAtual / ofertaAtual) * 100;
    scoreAtual = percentual;
  }

  // Score anterior
  let scoreAnterior: number | null = null;

  if (ofertaAnterior !== null && ofertaAnterior > 0 && realizadosAnterior !== null) {
    scoreAnterior = (realizadosAnterior / ofertaAnterior) * 100;
  }

  const faixa = classificarPorPercentual(scoreAtual);
  const evolucao = compararScores(scoreAtual, scoreAnterior);

  return {
    score: scoreAtual,
    valorAtual: realizadosAtual,
    valorAnterior: realizadosAnterior,
    ofertaAtual,
    ofertaAnterior,
    faixa,
    evolucao,
  };
}

// ─── Cálculo de Score Sem Oferta (livre - repertório) ────────────────────────

export function calcularScoreSemOferta(
  valorAtual: number,
  valorAnterior: number | null
): ScoreMetrica {
  let scoreAtual: number | null = null;

  if (valorAtual === 0 && (valorAnterior === null || valorAnterior === 0)) {
    scoreAtual = null;  // Sem dados
  } else if (valorAnterior === null || valorAnterior === 0) {
    scoreAtual = valorAtual > 0 ? 100 : 0;
  } else {
    const percentual = (valorAtual / valorAnterior) * 100;
    scoreAtual = Math.min(percentual, 100);
  }

  let scoreAnterior: number | null = null;
  if (valorAnterior !== null && valorAnterior > 0) {
    scoreAnterior = 100;  // Base de comparação
  }

  const faixa = classificarPorPercentual(scoreAtual);
  const evolucao = compararScores(scoreAtual, scoreAnterior);

  return {
    score: scoreAtual,
    valorAtual,
    valorAnterior,
    ofertaAtual: null,
    ofertaAnterior: null,
    faixa,
    evolucao,
  };
}

// ─── Score Geral (secundário) ─────────────────────────────────────────────────

export interface ScoresIndividuais {
  redacoes: number | null;
  presenca: number | null;
  exercicios: number | null;
  lousa: number | null;
  micro: number | null;
  guia: number | null;
  repertorio: number | null;
}

export function calcularScoreGeral(scores: ScoresIndividuais): number | null {
  const metricas = [
    { score: scores.redacoes,   peso: RADAR_CONFIG.pesos.redacoes },
    { score: scores.presenca,   peso: RADAR_CONFIG.pesos.frequencia },
    { score: scores.exercicios, peso: RADAR_CONFIG.pesos.exercicios },
    { score: scores.lousa,      peso: RADAR_CONFIG.pesos.lousas },
    { score: scores.micro,      peso: RADAR_CONFIG.pesos.microItens },
    { score: scores.guia,       peso: RADAR_CONFIG.pesos.guias },
    { score: scores.repertorio, peso: RADAR_CONFIG.pesos.repertorio },
  ];

  const validas = metricas.filter(m => m.score !== null);

  // Mínimo 3 métricas válidas para calcular score geral
  if (validas.length < RADAR_CONFIG.robustez.minimoMetricasValidas) {
    return null;
  }

  const somaPesos = validas.reduce((acc, m) => acc + m.peso, 0);
  const somaPonderada = validas.reduce((acc, m) => acc + (m.score! * m.peso), 0);

  // Score de 0-100 convertido para 0-10
  const scoreGeral = (somaPonderada / somaPesos) / 10;

  return Math.round(scoreGeral * 10) / 10;
}

// ─── Verificação: aluno apto para avaliação no período ───────────────────────

export function alunoAptoParaAvaliar(
  dataAprovacao: string | null,
  mes: number,
  ano: number
): boolean {
  if (!dataAprovacao) return true;

  try {
    const aprovacao = parseISO(dataAprovacao);
    const fimMes = endOfMonth(new Date(ano, mes - 1, 1));
    const dias = differenceInDays(fimMes, aprovacao);
    return dias >= RADAR_CONFIG.robustez.diasMinimoNaTurma;
  } catch {
    return true;
  }
}

// ─── Status Bolsista ──────────────────────────────────────────────────────────

export function calcularStatusBolsista(
  isBolsista: boolean,
  scoreGeral: number | null,
  scoresMetricas: {
    redacoes: ScoreMetrica;
    presenca: ScoreMetrica;
    exercicios: ScoreMetrica;
  },
  historicoScoreGeral: (number | null)[]  // últimos 3-4 meses
): StatusBolsista {
  if (!isBolsista) {
    return {
      isBolsista: false,
      nivel: null,
      label: '',
      cor: '',
      alertas: [],
    };
  }

  const alertas: string[] = [];

  // Verificar quedas por métrica
  if (scoresMetricas.redacoes.evolucao.tipo === 'queda' ||
      scoresMetricas.redacoes.evolucao.tipo === 'queda_forte') {
    alertas.push('Queda no envio de redações');
  }

  if (scoresMetricas.presenca.evolucao.tipo === 'queda' ||
      scoresMetricas.presenca.evolucao.tipo === 'queda_forte') {
    alertas.push('Queda na presença');
  }

  // Baixa participação
  if (scoresMetricas.exercicios.score !== null && scoresMetricas.exercicios.score < 50) {
    alertas.push('Baixa participação em exercícios');
  }

  // Tendência negativa (3 quedas consecutivas no score geral)
  const validos = historicoScoreGeral.filter((s): s is number => s !== null);
  if (validos.length >= RADAR_CONFIG.bolsista.mesesQuedaAlerta) {
    const ultimos = validos.slice(-RADAR_CONFIG.bolsista.mesesQuedaAlerta);
    const quedaConsecutiva = ultimos.every((s, i) => i === 0 || s < ultimos[i - 1]);

    if (quedaConsecutiva) {
      alertas.push('Tendência negativa há 3 meses');
    }
  }

  // Classificação de nível
  if (alertas.some(a => a.includes('Tendência negativa'))) {
    return {
      isBolsista: true,
      nivel: 'alerta',
      label: 'Alerta Pedagógico',
      cor: '#7c3aed',
      alertas,
    };
  }

  if (scoreGeral !== null && scoreGeral < RADAR_CONFIG.bolsista.scoreRisco) {
    return {
      isBolsista: true,
      nivel: 'risco',
      label: 'Bolsista em Risco',
      cor: '#ef4444',
      alertas,
    };
  }

  if (scoreGeral !== null && scoreGeral < RADAR_CONFIG.bolsista.scoreAtencao) {
    return {
      isBolsista: true,
      nivel: 'atencao',
      label: 'Bolsista: Atenção',
      cor: '#f59e0b',
      alertas,
    };
  }

  return {
    isBolsista: true,
    nivel: 'ok',
    label: 'Bolsista',
    cor: '#10b981',
    alertas: alertas.length > 0 ? alertas : ['Desempenho adequado'],
  };
}

// ─── Alertas automáticos ──────────────────────────────────────────────────────

export interface Alerta {
  tipo: 'alerta' | 'info' | 'positivo';
  texto: string;
}

export function gerarAlertas(
  scoresMetricas: {
    redacoes: ScoreMetrica;
    presenca: ScoreMetrica;
    exercicios: ScoreMetrica;
    lousa: ScoreMetrica;
    micro: ScoreMetrica;
    guia: ScoreMetrica;
    repertorio: ScoreMetrica;
  },
  scoreGeral: number | null,
  isBolsista: boolean
): Alerta[] {
  const alertas: Alerta[] = [];

  // Alertas de queda por métrica
  Object.entries(scoresMetricas).forEach(([nome, metrica]) => {
    if (metrica.evolucao.tipo === 'queda_forte') {
      const labels: Record<string, string> = {
        redacoes: 'Redações',
        presenca: 'Presença',
        exercicios: 'Exercícios',
        lousa: 'Lousa',
        micro: 'Microaprendizagem',
        guia: 'Guia Temático',
        repertorio: 'Repertório',
      };
      alertas.push({
        tipo: 'alerta',
        texto: `Queda significativa em ${labels[nome]}`
      });
    }
  });

  // Score crítico
  if (scoreGeral !== null && scoreGeral < 3.0) {
    alertas.push({ tipo: 'alerta', texto: 'Score geral crítico' });
  }

  // Sem redações
  if (scoresMetricas.redacoes.valorAtual === 0) {
    alertas.push({ tipo: 'alerta', texto: 'Nenhuma redação enviada no período' });
  }

  // Frequência baixa
  if (scoresMetricas.presenca.score !== null && scoresMetricas.presenca.score < 40) {
    alertas.push({
      tipo: 'alerta',
      texto: `Frequência baixa: ${Math.round(scoresMetricas.presenca.score)}%`
    });
  }

  // Melhoras significativas
  Object.entries(scoresMetricas).forEach(([nome, metrica]) => {
    if (metrica.evolucao.tipo === 'evolucao_forte') {
      const labels: Record<string, string> = {
        redacoes: 'Redações',
        presenca: 'Presença',
        exercicios: 'Exercícios',
        lousa: 'Lousa',
        micro: 'Microaprendizagem',
        guia: 'Guia Temático',
        repertorio: 'Repertório',
      };
      alertas.push({
        tipo: 'positivo',
        texto: `Evolução significativa em ${labels[nome]}`
      });
    }
  });

  // Bolsista
  if (isBolsista && scoreGeral !== null) {
    if (scoreGeral < RADAR_CONFIG.bolsista.scoreRisco) {
      alertas.push({ tipo: 'alerta', texto: 'Bolsista abaixo do desempenho mínimo (< 5,0)' });
    } else if (scoreGeral < RADAR_CONFIG.bolsista.scoreAtencao) {
      alertas.push({ tipo: 'alerta', texto: 'Bolsista com score abaixo de 7,0 — requer atenção' });
    }
  }

  // Limitar alertas
  return alertas.slice(0, 5);
}
