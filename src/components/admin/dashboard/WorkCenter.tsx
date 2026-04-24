import { ChevronRight } from 'lucide-react';

interface CardDataEntry {
  info: string;
  badge?: string;
  chips?: string[];
}

interface WorkCenterProps {
  cardData: Record<string, CardDataEntry>;
  isLoading: boolean;
  onCardClick: (view: string) => void;
}

interface WorkItem {
  id: string;
  label: string;
  getCount?: (d: Record<string, CardDataEntry>) => string | undefined;
}

const SECTIONS: {
  id: string;
  title: string;
  border: string;
  bg: string;
  titleColor: string;
  items: WorkItem[];
}[] = [
  {
    id: 'corrigir',
    title: 'Para corrigir',
    border: 'border-rose-200',
    bg: 'bg-rose-50/60',
    titleColor: 'text-rose-700',
    items: [
      { id: 'redacoes-enviadas', label: 'Redações enviadas', getCount: (d) => d['redacoes-enviadas']?.info },
      { id: 'exercicios', label: 'Exercícios', getCount: (d) => d['exercicios']?.info },
      { id: 'lousa', label: 'Atividades da lousa', getCount: (d) => d['lousa']?.info },
    ],
  },
  {
    id: 'publicar',
    title: 'Para publicar',
    border: 'border-amber-200',
    bg: 'bg-amber-50/60',
    titleColor: 'text-amber-700',
    items: [
      { id: 'temas', label: 'Temas', getCount: (d) => d['temas']?.info },
      { id: 'redacoes', label: 'Redações Exemplares', getCount: (d) => d['redacoes']?.info },
      { id: 'redacoes-comentadas', label: 'Redações Comentadas', getCount: (d) => d['redacoes-comentadas']?.info },
    ],
  },
  {
    id: 'acompanhar',
    title: 'Para acompanhar',
    border: 'border-blue-200',
    bg: 'bg-blue-50/60',
    titleColor: 'text-blue-700',
    items: [
      { id: 'alunos', label: 'Alunos', getCount: (d) => d['alunos']?.info },
      { id: 'radar', label: 'Radar de desempenho' },
      { id: 'top5', label: 'TOP 5' },
      { id: 'simulados', label: 'Simulados', getCount: (d) => d['simulados']?.info },
    ],
  },
  {
    id: 'configurar',
    title: 'Para configurar',
    border: 'border-violet-200',
    bg: 'bg-violet-50/60',
    titleColor: 'text-violet-700',
    items: [
      { id: 'jarvis', label: 'Jarvis e IA', getCount: (d) => d['jarvis']?.info },
      { id: 'processo-seletivo', label: 'Processo Seletivo', getCount: (d) => d['processo-seletivo']?.info },
      { id: 'exportacao', label: 'Exportação de dados' },
      { id: 'configuracoes', label: 'Configurações' },
    ],
  },
];

export const WorkCenter = ({ cardData, isLoading, onCardClick }: WorkCenterProps) => (
  <div>
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      Central de trabalho
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {SECTIONS.map((section) => (
        <div
          key={section.id}
          className={`border ${section.border} ${section.bg} rounded-xl p-4`}
        >
          <h3 className={`text-[10px] font-semibold ${section.titleColor} uppercase tracking-wider mb-3`}>
            {section.title}
          </h3>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const raw = isLoading ? '...' : (item.getCount?.(cardData) ?? undefined);
              const numMatch = raw?.match(/^(\d+)/);
              const num = numMatch ? numMatch[1] : null;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onCardClick(item.id)}
                    className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/70 transition-colors group text-left"
                  >
                    <span className="text-xs text-gray-700 truncate flex-1">{item.label}</span>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      {num && (
                        <span className="text-[10px] font-semibold text-gray-500 bg-white/80 px-1.5 py-0.5 rounded border border-gray-200/80">
                          {num}
                        </span>
                      )}
                      <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  </div>
);
