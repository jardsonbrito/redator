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
    accent: '#16a34a',
  },
  {
    id: 'inbox',
    label: 'Mensagens',
    icon: MessageCircle,
    accent: '#f97316',
  },
  {
    id: 'salas-virtuais',
    label: 'Aulas agendadas',
    icon: Video,
    accent: '#db2777',
  },
  {
    id: 'ajuda-rapida',
    label: 'Ajuda Rápida',
    icon: HelpCircle,
    accent: '#7c3aed',
  },
] as const;

export const PriorityCards = ({
  cardData,
  isLoading,
  onCardClick,
}: PriorityCardsProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
    {PRIORITY_ITEMS.map((item) => {
      const Icon = item.icon;
      const raw = isLoading ? '...' : (cardData[item.id]?.info || '—');
      const numMatch = raw.match(/^(\d+)/);
      const num = numMatch ? numMatch[1] : null;
      const note = num ? raw.replace(num, '').trim() : '';

      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onCardClick(item.id)}
          className="group text-left border border-purple-900/[0.09] rounded-[22px] bg-white/95 p-4 shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
          style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: '13px', alignItems: 'start' }}
        >
          {/* Ícone com cor de acento */}
          <div
            className="w-[42px] h-[42px] rounded-[15px] flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `${item.accent}1a`,
              color: item.accent,
            }}
          >
            <Icon size={19} />
          </div>

          {/* Conteúdo */}
          <div>
            <p className="text-[13px] font-semibold text-[#746b80] mb-2 leading-tight">
              {item.label}
            </p>
            {num ? (
              <strong
                className="block font-bold text-[#21122f] leading-none"
                style={{ fontSize: '31px', letterSpacing: '-.045em' }}
              >
                {num}
              </strong>
            ) : (
              <strong className="block text-xl font-bold text-[#21122f]">{raw}</strong>
            )}
            {note && (
              <span className="block mt-2 text-xs text-[#8a8096]">{note}</span>
            )}
          </div>
        </button>
      );
    })}
  </div>
);
