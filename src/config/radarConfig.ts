export interface FaixaConfig {
  label: string;
  min: number;
  max: number;
  cor: string;
  bg: string;
  corTexto: string;
}

export interface TendenciaConfig {
  label: string;
  minDelta: number;
  cor: string;
  icone: string;
}

export const RADAR_CONFIG = {
  // Pesos somam 10.0 (novos pesos pedagógicos)
  pesos: {
    redacoes:   4.0,   // Prioridade máxima
    frequencia: 3.0,   // Segunda prioridade
    exercicios: 1.2,
    lousas:     0.8,
    microItens: 0.5,
    repertorio: 0.2,
    guias:      0.3,
  },

  // Proporções para redações (simulado vs regulares)
  redacoes: {
    pesoSimulado:   0.4,  // 40% do score de redações
    pesoRegulares:  0.6,  // 60% do score de redações
  },

  // Faixas baseadas em percentual (0-100)
  faixas: [
    { label: 'Excelente',        min: 100,  max: 100, cor: '#10b981', bg: '#ecfdf5', corTexto: '#065f46' },
    { label: 'Adequado',         min: 70,   max: 99,  cor: '#3b82f6', bg: '#eff6ff', corTexto: '#1e40af' },
    { label: 'Abaixo da média',  min: 50,   max: 69,  cor: '#f59e0b', bg: '#fffbeb', corTexto: '#92400e' },
    { label: 'Baixo desempenho', min: 25,   max: 49,  cor: '#f97316', bg: '#fff7ed', corTexto: '#9a3412' },
    { label: 'Crítico',          min: 0,    max: 24,  cor: '#ef4444', bg: '#fef2f2', corTexto: '#991b1b' },
  ] as FaixaConfig[],

  // Faixas para score geral (0-10)
  faixasScoreGeral: [
    { label: 'Excelente',        min: 8.5,  max: 10.0, cor: '#10b981', bg: '#ecfdf5', corTexto: '#065f46' },
    { label: 'Adequado',         min: 7.0,  max: 8.49, cor: '#3b82f6', bg: '#eff6ff', corTexto: '#1e40af' },
    { label: 'Abaixo da média',  min: 5.0,  max: 6.99, cor: '#f59e0b', bg: '#fffbeb', corTexto: '#92400e' },
    { label: 'Baixo desempenho', min: 3.0,  max: 4.99, cor: '#f97316', bg: '#fff7ed', corTexto: '#9a3412' },
    { label: 'Crítico',          min: 0.0,  max: 2.99, cor: '#ef4444', bg: '#fef2f2', corTexto: '#991b1b' },
  ] as FaixaConfig[],

  // Evolução (comparação intraindividual)
  evolucao: [
    { label: 'Evolução significativa', minDelta:  5,        cor: '#10b981', icone: '▲▲' },
    { label: 'Evoluiu',                minDelta:  0.1,      cor: '#10b981', icone: '▲' },
    { label: 'Manteve',                minDelta: -5,        cor: '#6b7280', icone: '→' },
    { label: 'Caiu',                   minDelta: -10,       cor: '#f97316', icone: '▼' },
    { label: 'Queda significativa',    minDelta: -Infinity, cor: '#ef4444', icone: '▼▼' },
  ] as TendenciaConfig[],

  bolsista: {
    scoreAtencao:     7.0,  // Score geral < 7.0
    scoreRisco:       5.0,  // Score geral < 5.0
    mesesQuedaAlerta: 3,    // Queda consecutiva por 3 meses
  },

  robustez: {
    diasMinimoNaTurma: 7,   // Mínimo de dias para avaliar aluno
    minimoMetricasValidas: 3, // Mínimo de métricas para score geral
  },
};
