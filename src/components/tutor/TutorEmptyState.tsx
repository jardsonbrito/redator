import {
  HelpCircle, BookOpen, Link2, FileText, Lightbulb,
  AlignLeft, Star, MessageSquare, PenLine, Type, Search, CheckCircle, Lock,
  type LucideIcon,
} from 'lucide-react';
import { useTutorQuickActions } from '@/hooks/useTutorQuickActions';
import { JarvisIcon } from '@/components/icons/JarvisIcon';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, AlignLeft, Link2, Lightbulb, HelpCircle,
  BookOpen, Star, MessageSquare, PenLine, Type, Search, CheckCircle,
};

// Cor da barra de progresso conforme % de uso
function barColor(pct: number, esgotado: boolean) {
  if (esgotado || pct >= 100) return 'bg-red-400';
  if (pct >= 75) return 'bg-amber-400';
  if (pct >= 40) return 'bg-indigo-400';
  return 'bg-purple-500';
}

interface TutorEmptyStateProps {
  onQuickAction:     (label: string, instrucao: string, atalhoId?: string) => void;
  subtabLabel?:      string | null;
  atalhoContadores?: Record<string, number>;
}

export function TutorEmptyState({ onQuickAction, subtabLabel, atalhoContadores = {} }: TutorEmptyStateProps) {
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[640px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[88px] rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : actions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[640px]">
              {actions.map(({ id, icone, label, descricao, texto, max_execucoes }) => {
                const Icon     = ICON_MAP[icone] ?? HelpCircle;
                const count    = atalhoContadores[id] ?? 0;
                const limitado = max_execucoes != null;
                const esgotado = limitado && count >= max_execucoes!;
                const pct      = limitado ? Math.min(100, (count / max_execucoes!) * 100) : 0;
                const isLast   = actions.length % 2 !== 0 && id === actions[actions.length - 1].id;
                const cor      = barColor(pct, esgotado);

                return (
                  <button
                    key={id}
                    onClick={() => !esgotado && onQuickAction(label, texto, id)}
                    disabled={esgotado}
                    className={cn(
                      'group flex flex-col gap-2.5 p-4 bg-white border rounded-2xl text-left transition-all duration-150',
                      esgotado
                        ? 'border-slate-200 opacity-55 cursor-not-allowed'
                        : 'border-slate-200 hover:border-purple-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
                      isLast ? 'sm:col-span-2' : '',
                    )}
                  >
                    {/* ── Linha superior: ícone + textos ── */}
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        'mt-0.5 w-8 h-8 rounded-lg bg-slate-50 border border-slate-200',
                        'flex items-center justify-center flex-shrink-0 transition-colors',
                        !esgotado && 'group-hover:bg-purple-50 group-hover:border-purple-200',
                      )}>
                        {esgotado
                          ? <Lock className="w-3.5 h-3.5 text-slate-400" />
                          : <Icon className="w-3.5 h-3.5 text-purple-600" />
                        }
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'text-[13.5px] font-medium leading-snug',
                          esgotado ? 'text-slate-400' : 'text-slate-800 group-hover:text-purple-900',
                        )}>
                          {label}
                        </p>
                        {descricao && (
                          <p className="text-[12px] text-slate-400 mt-0.5 font-normal leading-snug line-clamp-1">
                            {descricao}
                          </p>
                        )}
                      </div>

                      {/* Contador simples para atalhos sem limite */}
                      {!limitado && count > 0 && (
                        <span className="flex items-center gap-1 shrink-0 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          <span className="text-[10px] font-semibold text-purple-500 leading-none">{count}</span>
                        </span>
                      )}
                    </div>

                    {/* ── Barra de progresso (só para atalhos com limite) ── */}
                    {limitado && (
                      <div className="space-y-1.5 pt-0.5">
                        {/* Legenda */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            'text-[11px] font-medium leading-none',
                            esgotado ? 'text-red-400' : 'text-slate-500',
                          )}>
                            {esgotado
                              ? 'Limite atingido'
                              : count === 0
                                ? `Até ${max_execucoes} sessão${max_execucoes! > 1 ? 'ões' : ''} disponíve${max_execucoes! > 1 ? 'is' : 'l'}`
                                : `${count} de ${max_execucoes} sessões usadas`
                            }
                          </span>
                          <span className={cn(
                            'text-[11px] font-bold tabular-nums leading-none shrink-0',
                            esgotado ? 'text-red-400' : pct >= 75 ? 'text-amber-500' : 'text-purple-600',
                          )}>
                            {Math.round(pct)}%
                          </span>
                        </div>

                        {/* Track + fill */}
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-700', cor)}
                            style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
                          />
                        </div>

                        {/* Marcadores de sessões individuais */}
                        {max_execucoes! <= 10 && (
                          <div className="flex gap-1 mt-0.5">
                            {Array.from({ length: max_execucoes! }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  'flex-1 h-1 rounded-full transition-colors duration-300',
                                  i < count
                                    ? esgotado ? 'bg-red-300' : pct >= 75 ? 'bg-amber-400' : 'bg-purple-400'
                                    : 'bg-slate-200',
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
