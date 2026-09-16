import { AlertCircle, HelpCircle, Video, Bot } from 'lucide-react';
import { JarvisIcon } from '@/components/icons/JarvisIcon';

interface CardDataEntry {
  info: string;
  badge?: string;
  chips?: string[];
  secondInfo?: string;  // métrica secundária (ex: Jarvis Corretor)
  secondNote?: string;  // rótulo da métrica secundária
}

interface PriorityCardsProps {
  cardData: Record<string, CardDataEntry>;
  isLoading: boolean;
  onCardClick: (view: string) => void;
}

const PRIORITY_ITEMS = [
  { id: 'redacoes-enviadas', label: 'Redações aguardando', icon: AlertCircle, accent: '#16a34a', secondId: undefined },
  { id: 'ajuda-rapida',      label: 'Ajuda Rápida',        icon: HelpCircle,  accent: '#0891b2', secondId: undefined },
  { id: 'salas-virtuais',    label: 'Aulas agendadas',      icon: Video,       accent: '#db2777', secondId: undefined },
  { id: 'jarvis',            label: 'Jarvis',               icon: Bot,         accent: '#7c3aed', secondId: 'jarvis_correcao' },
] as const;

export const PriorityCards = ({
  cardData,
  isLoading,
  onCardClick,
}: PriorityCardsProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
    {PRIORITY_ITEMS.map((item) => {
      const Icon = item.icon;
      const entry = cardData[item.id];
      const raw = isLoading ? '...' : (entry?.info || '—');
      const numMatch = raw.match(/^(\d+)/);
      const num = numMatch ? numMatch[1] : null;
      const note = num ? raw.replace(num, '').trim() : '';

      const rawSecond = isLoading ? '...' : (entry?.secondInfo || null);
      const numSecondMatch = rawSecond?.match(/^(\d+)/);
      const numSecond = numSecondMatch ? numSecondMatch[1] : rawSecond;
      const noteSecond = entry?.secondNote || '';
      const isSplit = !!item.secondId && !!rawSecond;

      const cardBase = "group text-left border border-purple-900/[0.09] rounded-[22px] bg-white/95 shadow-md hover:-translate-y-0.5 transition-all duration-150";

      if (isSplit) {
        /* ── Card dividido (Jarvis: alunos | professores) ── */
        return (
          <div
            key={item.id}
            className={`${cardBase} p-4`}
            style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: '13px', alignItems: 'start' }}
          >
            {/* Ícone */}
            <div
              className="w-[42px] h-[42px] rounded-[15px] flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${item.accent}1a`, color: item.accent }}
            >
              <Icon size={19} />
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[#746b80] mb-2 leading-tight">{item.label}</p>
              <div className="flex gap-0">
                {/* Metade esquerda — Alunos */}
                <button
                  type="button"
                  onClick={() => onCardClick(item.id)}
                  className="flex-1 min-w-0 text-left rounded-l-xl pr-2 py-1 hover:bg-violet-50 transition-colors"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Bot size={10} className="text-violet-400 shrink-0" />
                    <span className="text-[9px] font-semibold text-violet-400 uppercase tracking-wide">Alunos</span>
                  </div>
                  <strong className="block font-bold text-[#21122f] leading-none" style={{ fontSize: '22px', letterSpacing: '-.04em' }}>
                    {num ?? raw}
                  </strong>
                  {note && <span className="block mt-0.5 text-[10px] text-[#8a8096] leading-tight">{note}</span>}
                </button>

                {/* Divisor */}
                <div className="w-px bg-zinc-100 self-stretch mx-1" />

                {/* Metade direita — Professores */}
                <button
                  type="button"
                  onClick={() => onCardClick(item.secondId!)}
                  className="flex-1 min-w-0 text-left rounded-r-xl pl-2 py-1 hover:bg-violet-50 transition-colors"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <JarvisIcon size={10} className="text-violet-400 shrink-0" />
                    <span className="text-[9px] font-semibold text-violet-400 uppercase tracking-wide">Professores</span>
                  </div>
                  <strong className="block font-bold text-[#21122f] leading-none" style={{ fontSize: '22px', letterSpacing: '-.04em' }}>
                    {numSecond ?? rawSecond}
                  </strong>
                  {noteSecond && <span className="block mt-0.5 text-[10px] text-[#8a8096] leading-tight">{noteSecond}</span>}
                </button>
              </div>
            </div>
          </div>
        );
      }

      /* ── Card padrão ── */
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onCardClick(item.id)}
          className={`${cardBase} cursor-pointer p-4`}
          style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: '13px', alignItems: 'start' }}
        >
          <div
            className="w-[42px] h-[42px] rounded-[15px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${item.accent}1a`, color: item.accent }}
          >
            <Icon size={19} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#746b80] mb-2 leading-tight">{item.label}</p>
            {num ? (
              <strong className="block font-bold text-[#21122f] leading-none" style={{ fontSize: '31px', letterSpacing: '-.045em' }}>
                {num}
              </strong>
            ) : (
              <strong className="block text-xl font-bold text-[#21122f]">{raw}</strong>
            )}
            {note && <span className="block mt-2 text-xs text-[#8a8096]">{note}</span>}
          </div>
        </button>
      );
    })}
  </div>
);
