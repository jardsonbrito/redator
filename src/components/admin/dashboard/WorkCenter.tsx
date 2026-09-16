import { Edit3, BookOpen, BarChart3, Settings } from 'lucide-react';

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
  getCount?: (d: Record<string, CardDataEntry>) => string | null;
}

const SECTIONS: {
  id: string;
  title: string;
  Icon: React.ComponentType<{ size?: number }>;
  items: WorkItem[];
}[] = [
  {
    id: 'corrigir',
    title: 'Para corrigir',
    Icon: Edit3,
    items: [
      { id: 'redacoes-enviadas', label: 'Redações enviadas', getCount: (d) => extractNum(d['redacoes-enviadas']?.info) },
      { id: 'exercicios', label: 'Exercícios', getCount: (d) => extractNum(d['exercicios']?.info) },
      { id: 'lousa', label: 'Atividades da lousa', getCount: (d) => extractNum(d['lousa']?.info) },
    ],
  },
  {
    id: 'publicar',
    title: 'Para publicar',
    Icon: BookOpen,
    items: [
      { id: 'temas', label: 'Temas', getCount: (d) => extractNum(d['temas']?.info) },
      { id: 'redacoes', label: 'Redações Exemplares', getCount: (d) => extractNum(d['redacoes']?.info) },
      { id: 'redacoes-comentadas', label: 'Redações Comentadas', getCount: (d) => extractNum(d['redacoes-comentadas']?.info) },
    ],
  },
  {
    id: 'acompanhar',
    title: 'Para acompanhar',
    Icon: BarChart3,
    items: [
      { id: 'alunos', label: 'Alunos', getCount: (d) => extractNum(d['alunos']?.info) },
      { id: 'radar', label: 'Radar de desempenho' },
      { id: 'top5', label: 'TOP 5' },
      { id: 'simulados', label: 'Simulados', getCount: (d) => extractNum(d['simulados']?.info) },
    ],
  },
  {
    id: 'configurar',
    title: 'Para configurar',
    Icon: Settings,
    items: [
      { id: 'jarvis', label: 'Jarvis e IA', getCount: (d) => extractNum(d['jarvis']?.info) },
      { id: 'processo-seletivo', label: 'Processo Seletivo', getCount: (d) => extractNum(d['processo-seletivo']?.info) },
      { id: 'exportacao', label: 'Exportação de dados' },
      { id: 'configuracoes', label: 'Configurações' },
    ],
  },
];

function extractNum(info?: string): string | null {
  if (!info) return null;
  const m = info.match(/^(\d+)/);
  return m ? m[1] : null;
}

export const WorkCenter = ({
  cardData,
  isLoading,
  onCardClick,
}: WorkCenterProps) => (
  <div
    className="border border-purple-900/[0.09] rounded-[26px] bg-white/95 p-[18px]"
    style={{ boxShadow: '0 10px 30px rgba(63,32,104,.045)' }}
  >
    {/* Header */}
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2
        className="font-bold text-[#21122f]"
        style={{ fontSize: '18px', letterSpacing: '-.03em' }}
      >
        Central de trabalho
      </h2>
      <button
        type="button"
        className="border border-purple-900/[0.09] bg-white text-[#6f647c] rounded-xl px-2.5 py-2 text-xs font-bold hover:bg-gray-50 transition-colors whitespace-nowrap"
      >
        Ver fluxo completo
      </button>
    </div>

    {/* 2x2 grid */}
    <div className="grid grid-cols-2 gap-3">
      {SECTIONS.map((section) => {
        const { Icon } = section;
        return (
          <div
            key={section.id}
            className="border border-purple-900/[0.07] bg-[#fdfcff] rounded-[18px] p-3.5 text-left"
          >
            {/* Head */}
            <div className="flex items-center gap-2.5 text-[#4B078F]">
              <span className="w-8 h-8 flex items-center justify-center rounded-[11px] bg-[#f1e8ff] flex-shrink-0">
                <Icon size={17} />
              </span>
              <strong className="text-sm font-bold">{section.title}</strong>
            </div>

            {/* Items */}
            <ul className="mt-3 space-y-1.5">
              {section.items.map((item) => {
                const count = isLoading ? '…' : (item.getCount?.(cardData) ?? null);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onCardClick(item.id)}
                      className="flex items-center gap-1.5 text-[#746b80] text-xs hover:text-[#4B078F] transition-colors w-full text-left"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a764ff] flex-shrink-0" />
                      <span className="truncate">
                        {item.label}
                        {count !== null ? `: ${count}` : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  </div>
);
