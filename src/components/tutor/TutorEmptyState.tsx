import { Sparkles, HelpCircle,
  BookOpen, Link2, FileText, Lightbulb,
  AlignLeft, Star, MessageSquare, PenLine, Type, Search, CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { useTutorQuickActions } from '@/hooks/useTutorQuickActions';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, AlignLeft, Link2, Lightbulb, HelpCircle,
  BookOpen, Star, MessageSquare, PenLine, Type, Search, CheckCircle,
};

interface TutorEmptyStateProps {
  onQuickAction: (texto: string) => void;
}

export function TutorEmptyState({ onQuickAction }: TutorEmptyStateProps) {
  const { actions, isLoading } = useTutorQuickActions();

  return (
    <div className="flex flex-col h-full px-6 py-8 select-none">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-10 w-10 rounded-2xl bg-purple-100 flex items-center justify-center shadow-sm flex-shrink-0">
            <Sparkles className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-slate-950">
              Jarvis — tutor de redação
            </h1>
            <p className="mt-1 text-sm text-slate-400 font-normal">
              Redação na prática, aprovação na certa.
            </p>
          </div>
        </div>
      </header>

      {/* Quick actions */}
      {isLoading ? (
        <div>
          <div className="h-3 w-32 rounded bg-slate-200 animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[58px] rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      ) : actions.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Atalhos rápidos
            </p>
            <p className="hidden sm:block text-[12px] text-slate-400">
              Escolha um ponto de partida ou pergunte livremente.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {actions.map(({ id, icone, label, texto }) => {
              const Icon = ICON_MAP[icone] ?? HelpCircle;
              return (
                <button
                  key={id}
                  onClick={() => onQuickAction(texto)}
                  className="group h-[58px] rounded-2xl border border-slate-200 bg-white px-5 flex items-center gap-4 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-[0_12px_28px_rgba(126,34,206,0.10)] hover:bg-purple-50/30"
                >
                  <span className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-purple-100">
                    <Icon className="h-4 w-4 text-purple-600" />
                  </span>
                  <span className="text-[14px] font-medium text-slate-800 group-hover:text-purple-900 truncate">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50/50 px-5 py-4">
            <p className="text-sm leading-relaxed text-slate-600">
              Os atalhos são apenas sugestões. Você pode perguntar livremente sobre redação, gramática, ENEM ou enviar um texto para análise.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
