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
      {/* Banner hero */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-700 to-violet-600 text-white p-6 shadow-md mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Professor particular de redação e português
        </div>
        <h2 className="text-2xl font-semibold leading-tight">
          Vamos melhorar essa redação juntos.
        </h2>
        <p className="text-purple-100 mt-2 text-sm leading-relaxed max-w-lg">
          Envie frases, teses, argumentos ou dúvidas gramaticais. O Tutor Jarvis analisa item por item e explica como melhorar sua escrita.
        </p>
      </div>

      {/* Quick actions */}
      {isLoading ? (
        <div>
          <div className="h-3 w-32 rounded bg-slate-200 animate-pulse mb-3" />
          <div className="grid grid-cols-2 gap-2 max-w-lg">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      ) : actions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Atalhos rápidos
          </p>
          <div className="grid grid-cols-2 gap-2 max-w-lg">
            {actions.map(({ id, icone, label, texto }) => {
              const Icon = ICON_MAP[icone] ?? HelpCircle;
              return (
                <button
                  key={id}
                  onClick={() => onQuickAction(texto)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-200 text-left transition-colors text-sm text-slate-700 font-medium shadow-sm"
                >
                  <Icon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Clique em um atalho ou escreva sua pergunta abaixo
          </p>
        </div>
      )}
    </div>
  );
}
