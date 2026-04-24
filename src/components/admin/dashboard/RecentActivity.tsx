import { ArrowRight } from 'lucide-react';

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

const ACTIVITY_SOURCES: { id: string; label: string }[] = [
  { id: 'redacoes-enviadas', label: 'Redações enviadas' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'ajuda-rapida', label: 'Ajuda rápida' },
  { id: 'alunos', label: 'Alunos' },
  { id: 'anotacoes', label: 'Anotações' },
  { id: 'avisos', label: 'Mural de Avisos' },
];

export const RecentActivity = ({
  cardData,
  isLoading,
  onCardClick,
}: RecentActivityProps) => {
  const items = isLoading
    ? []
    : ACTIVITY_SOURCES.filter((s) => {
        const info = cardData[s.id]?.info;
        return info && info.trim() !== '' && info !== 'Erro ao carregar';
      }).slice(0, 6);

  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Movimento recente
      </h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-6 text-sm text-gray-400 text-center">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-400 text-center">
            Nenhuma atividade
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((source) => {
              const info = cardData[source.id]?.info || '';
              return (
                <li key={source.id}>
                  <button
                    type="button"
                    onClick={() => onCardClick(source.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {source.label}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{info}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 ml-2" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
