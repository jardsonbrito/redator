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
  metas: {
    redacoes:   2,
    exercicios: 3,
    lousas:     2,
    microItens: 5,
    repertorio: 3,
    guias:      1,
  },
  // Pesos somam 10.0
  pesos: {
    redacoes:   3.0,
    frequencia: 2.0,
    exercicios: 1.5,
    lousas:     1.0,
    microItens: 1.0,
    repertorio: 0.75,
    guias:      0.75,
  },
  faixas: [
    { label: 'Excelente',        min: 8.5,  max: 10.0, cor: '#10b981', bg: '#ecfdf5', corTexto: '#065f46' },
    { label: 'Adequado',         min: 7.0,  max: 8.49, cor: '#3b82f6', bg: '#eff6ff', corTexto: '#1e40af' },
    { label: 'Abaixo da média',  min: 5.0,  max: 6.99, cor: '#f59e0b', bg: '#fffbeb', corTexto: '#92400e' },
    { label: 'Baixo desempenho', min: 3.0,  max: 4.99, cor: '#f97316', bg: '#fff7ed', corTexto: '#9a3412' },
    { label: 'Crítico',          min: 0.0,  max: 2.99, cor: '#ef4444', bg: '#fef2f2', corTexto: '#991b1b' },
  ] as FaixaConfig[],
  // Verificados em ordem: maior minDelta primeiro
  tendencias: [
    { label: 'Evolução',        minDelta:  0.5,      cor: '#10b981', icone: '▲' },
    { label: 'Estável',         minDelta: -0.5,      cor: '#6b7280', icone: '→' },
    { label: 'Queda',           minDelta: -1.5,      cor: '#f97316', icone: '▼' },
    { label: 'Queda acentuada', minDelta: -Infinity, cor: '#ef4444', icone: '▼▼' },
  ] as TendenciaConfig[],
  bolsista: {
    scoreAtencao:     7.0,
    scoreRisco:       5.0,
    mesesQuedaAlerta: 2,
  },
  robustez: {
    diasMinimoNaTurma: 7,
  },
};
