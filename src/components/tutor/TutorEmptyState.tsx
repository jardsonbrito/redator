import {
  HelpCircle, BookOpen, Link2, FileText, Lightbulb,
  AlignLeft, Star, MessageSquare, PenLine, Type, Search, CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { useTutorQuickActions } from '@/hooks/useTutorQuickActions';
import { JarvisIcon } from '@/components/icons/JarvisIcon';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, AlignLeft, Link2, Lightbulb, HelpCircle,
  BookOpen, Star, MessageSquare, PenLine, Type, Search, CheckCircle,
};

interface TutorEmptyStateProps {
  onQuickAction: (label: string, instrucao: string) => void;
  subtabLabel?:  string | null;
}

export function TutorEmptyState({ onQuickAction, subtabLabel }: TutorEmptyStateProps) {
  const { actions, isLoading } = useTutorQuickActions();

  return (
    <div className="flex flex-col h-full px-8 py-10 select-none">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center mb-5 shadow-sm">
          <div className="w-5 h-5"><JarvisIcon /></div>
        </div>

        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-900 leading-[1.2] mb-3">
          {subtabLabel ? (
            <>Especialista em{' '}
              <span className="text-purple-700 italic">{subtabLabel}</span>
            </>
          ) : (
            <>Olá! Sou o Jarvis,<br />
              seu tutor de{' '}
              <span className="text-purple-700 italic">redação</span>.
            </>
          )}
        </h1>

        <p className="text-sm text-slate-500 font-normal leading-relaxed max-w-[440px]">
          {subtabLabel
            ? `Modo especializado em ${subtabLabel}. Cole um texto, faça uma pergunta ou peça um exercício.`
            : 'Redação na prática, aprovação na certa. Como posso te ajudar hoje?'
          }
        </p>
      </div>

      {/* ── Sugestões (só no modo conversacional) ────────────── */}
      {!subtabLabel && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-[640px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[66px] rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : actions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-[640px]">
              {actions.map(({ id, icone, label, descricao, texto }) => {
                const Icon = ICON_MAP[icone] ?? HelpCircle;
                return (
                  <button
                    key={id}
                    onClick={() => onQuickAction(label, texto)}
                    className={cn(
                      'group flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl text-left',
                      'hover:border-purple-200 hover:shadow-md hover:-translate-y-0.5',
                      'transition-all duration-150',
                      actions.length % 2 !== 0 && id === actions[actions.length - 1].id
                        ? 'sm:col-span-2'
                        : '',
                    )}
                  >
                    <span className={cn(
                      'mt-0.5 w-8 h-8 rounded-lg bg-slate-50 border border-slate-200',
                      'flex items-center justify-center flex-shrink-0',
                      'group-hover:bg-purple-50 group-hover:border-purple-200 transition-colors',
                    )}>
                      <Icon className="w-3.5 h-3.5 text-purple-600" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-slate-800 group-hover:text-purple-900 leading-snug">
                        {label}
                      </p>
                      {descricao && (
                        <p className="text-[12px] text-slate-400 mt-0.5 font-normal leading-snug">
                          {descricao}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Você pode perguntar livremente sobre redação, gramática, conectivos, repertório ou qualquer dúvida para o ENEM.
            </p>
          )}
        </>
      )}
    </div>
  );
}
