import { Edit3, Inbox, MessageCircle, Users, StickyNote, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CardDataEntry {
  info: string;
  badge?: string;
  chips?: string[];
}

interface RecentActivityProps {
  cardData: Record<string, CardDataEntry>;
  isLoading: boolean;
  onCardClick: (view: string) => void;
}

const SOURCES: {
  id: string;
  label: string;
  Icon: LucideIcon;
  timeLabel: string;
}[] = [
  { id: 'redacoes-enviadas', label: 'Redações enviadas', Icon: Edit3, timeLabel: 'agora' },
  { id: 'inbox', label: 'Inbox', Icon: Inbox, timeLabel: 'hoje' },
  { id: 'ajuda-rapida', label: 'Ajuda rápida', Icon: MessageCircle, timeLabel: 'hoje' },
  { id: 'alunos', label: 'Alunos', Icon: Users, timeLabel: 'geral' },
  { id: 'anotacoes', label: 'Anotações', Icon: StickyNote, timeLabel: 'geral' },
  { id: 'avisos', label: 'Mural de Avisos', Icon: Bell, timeLabel: 'geral' },
];

export const RecentActivity = ({
  cardData,
  isLoading,
  onCardClick,
}: RecentActivityProps) => {
  const items = SOURCES.filter((s) => {
    const info = cardData[s.id]?.info;
    return !isLoading && info && info.trim() !== '' && info !== 'Erro ao carregar';
  });

  return (
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
          Movimento recente
        </h2>
        <button
          type="button"
          className="border border-purple-900/[0.09] bg-white text-[#6f647c] rounded-xl px-2.5 py-2 text-xs font-bold hover:bg-gray-50 transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Lista de atividades */}
      {isLoading ? (
        <p className="text-sm text-[#8a8096] py-4 text-center">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#8a8096] py-4 text-center">Nenhuma atividade recente</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((source) => {
            const info = cardData[source.id]?.info || '';
            const { Icon } = source;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => onCardClick(source.id)}
                className="w-full text-left hover:bg-purple-50/30 transition-colors rounded-[16px] border border-purple-900/[0.06] bg-[#fdfcff] p-3"
                style={{ display: 'grid', gridTemplateColumns: '38px 1fr auto', gap: '10px', alignItems: 'center' }}
              >
                <span className="w-[38px] h-[38px] flex items-center justify-center rounded-[13px] bg-[#f1e8ff] text-[#4B078F] flex-shrink-0">
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <strong className="block text-sm text-[#21122f] font-semibold leading-tight">
                    {source.label}
                  </strong>
                  <small className="text-[#8a8096] text-xs leading-tight truncate block">
                    {info}
                  </small>
                </div>
                <em className="text-[11px] text-[#a49cad] not-italic flex-shrink-0">
                  {source.timeLabel}
                </em>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
