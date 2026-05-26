import {
  BookOpen, Link2, FileText, Lightbulb, HelpCircle,
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
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 select-none">
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Tutor Jarvis</h2>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-xs">
        Seu professor particular de português e redação ENEM. Pergunte, analise, pratique.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
          {actions.map(({ id, icone, label, texto }) => {
            const Icon = ICON_MAP[icone] ?? HelpCircle;
            return (
              <button
                key={id}
                onClick={() => onQuickAction(texto)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-left transition-colors text-sm text-gray-700 font-medium shadow-sm"
              >
                <Icon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6">
        Clique em um atalho ou escreva sua pergunta abaixo
      </p>
    </div>
  );
}
