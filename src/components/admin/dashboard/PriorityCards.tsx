import { AlertCircle, MessageCircle, Video, HelpCircle } from 'lucide-react';

interface CardDataEntry {
  info: string;
  badge?: string;
  chips?: string[];
}

interface PriorityCardsProps {
  cardData: Record<string, CardDataEntry>;
  isLoading: boolean;
  onCardClick: (view: string) => void;
}

const PRIORITY_ITEMS = [
  {
    id: 'redacoes-enviadas',
    label: 'Redações aguardando',
    icon: AlertCircle,
    accentColor: 'bg-rose-400',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    border: 'border-rose-100',
  },
  {
    id: 'inbox',
    label: 'Mensagens pendentes',
    icon: MessageCircle,
    accentColor: 'bg-amber-400',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    border: 'border-amber-100',
  },
  {
    id: 'salas-virtuais',
    label: 'Aulas agendadas',
    icon: Video,
    accentColor: 'bg-blue-400',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    border: 'border-blue-100',
  },
  {
    id: 'ajuda-rapida',
    label: 'Ajuda rápida pendente',
    icon: HelpCircle,
    accentColor: 'bg-violet-400',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    border: 'border-violet-100',
  },
] as const;

export const PriorityCards = ({
  cardData,
  isLoading,
  onCardClick,
}: PriorityCardsProps) => (
  <div>
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      Prioridades
    </h2>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {PRIORITY_ITEMS.map((item) => {
        const Icon = item.icon;
        const data = cardData[item.id];
        const raw = isLoading ? '...' : (data?.info || '—');
        const numMatch = raw.match(/^(\d+)/);
        const num = numMatch ? numMatch[1] : null;
        const tail = num ? raw.replace(num, '').trim() : raw;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onCardClick(item.id)}
            className={`relative overflow-hidden text-left bg-white border ${item.border} rounded-xl p-4 hover:shadow-md transition-all duration-200 group`}
          >
            {/* Barra de acento lateral */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 ${item.accentColor} rounded-l-xl`}
            />
            <div className="flex items-start justify-between gap-2 pl-2">
              <div className="flex-1 min-w-0">
                {num ? (
                  <>
                    <p className="text-2xl font-bold text-gray-800 leading-none">{num}</p>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {tail || item.label}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700">{raw}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.label}</p>
                  </>
                )}
              </div>
              <div className={`${item.iconBg} p-2 rounded-lg flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
