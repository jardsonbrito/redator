// Cores para os eixos temáticos
// Reutilizadas do TemasMetricsPanel.tsx

export interface EixoColors {
  bg: string;
  text: string;
  border: string;
  gradient: string;
  borderSide: string;
}

export const EIXOS_TEMATICOS = [
  'Social',
  'Saúde',
  'Saúde mental',
  'Tecnologia',
  'Educação',
  'Política',
  'Meio ambiente',
  'Economia',
  'Cultura',
  'Trabalho',
  'Cidadania',
  'Desigualdade',
] as const;

export type EixoTematico = typeof EIXOS_TEMATICOS[number];

export const eixoColorMap: Record<EixoTematico, EixoColors> = {
  'Social': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    gradient: 'from-blue-50 to-blue-100/50',
    borderSide: 'border-l-blue-500',
  },
  'Saúde': {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    gradient: 'from-green-50 to-green-100/50',
    borderSide: 'border-l-green-500',
  },
  'Saúde mental': {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    gradient: 'from-teal-50 to-teal-100/50',
    borderSide: 'border-l-teal-500',
  },
  'Tecnologia': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    gradient: 'from-purple-50 to-purple-100/50',
    borderSide: 'border-l-purple-500',
  },
  'Educação': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    gradient: 'from-amber-50 to-amber-100/50',
    borderSide: 'border-l-amber-500',
  },
  'Política': {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    gradient: 'from-red-50 to-red-100/50',
    borderSide: 'border-l-red-500',
  },
  'Meio ambiente': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    gradient: 'from-emerald-50 to-emerald-100/50',
    borderSide: 'border-l-emerald-500',
  },
  'Economia': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    gradient: 'from-orange-50 to-orange-100/50',
    borderSide: 'border-l-orange-500',
  },
  'Cultura': {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    gradient: 'from-pink-50 to-pink-100/50',
    borderSide: 'border-l-pink-500',
  },
  'Trabalho': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    gradient: 'from-indigo-50 to-indigo-100/50',
    borderSide: 'border-l-indigo-500',
  },
  'Cidadania': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    gradient: 'from-cyan-50 to-cyan-100/50',
    borderSide: 'border-l-cyan-500',
  },
  'Desigualdade': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    gradient: 'from-rose-50 to-rose-100/50',
    borderSide: 'border-l-rose-500',
  },
};

const defaultColor: EixoColors = {
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  border: 'border-gray-200',
  gradient: 'from-gray-50 to-gray-100/50',
  borderSide: 'border-l-gray-500',
};

export function getEixoColors(eixo: string): EixoColors {
  return eixoColorMap[eixo as EixoTematico] || defaultColor;
}

export function isValidEixo(eixo: string): eixo is EixoTematico {
  return EIXOS_TEMATICOS.includes(eixo as EixoTematico);
}
