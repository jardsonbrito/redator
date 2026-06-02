import { useState } from 'react';
import { Plus, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import type { TutorConversa } from '@/hooks/useTutorConversas';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SubtabItem {
  id:    string;
  label: string;
}

interface TutorSidebarProps {
  conversas:            TutorConversa[];
  loading:              boolean;
  activeConversationId: string | null;
  onSelect:             (id: string) => void;
  onNew:                () => void;
  onDeletar:            (id: string) => Promise<void>;
  creditosRestantes?:   number;
  subtabs?:             SubtabItem[];
  activeSubtabId?:      string | null;
  onSelectSubtab?:      (id: string, label: string) => void;
}

export function TutorSidebar({
  conversas,
  loading,
  activeConversationId,
  onSelect,
  onNew,
  onDeletar,
  creditosRestantes,
  subtabs = [],
  activeSubtabId,
  onSelectSubtab,
}: TutorSidebarProps) {
  const [hoveredId, setHoveredId]        = useState<string | null>(null);
  const [deletandoId, setDeletandoId]    = useState<string | null>(null);
  const [confirmDeletarId, setConfirmId] = useState<string | null>(null);

  const handleDeletar = async (id: string) => {
    setDeletandoId(id);
    try {
      await onDeletar(id);
    } finally {
      setDeletandoId(null);
      setConfirmId(null);
    }
  };

  const formatarData = (dateStr: string) => {
    const d    = new Date(dateStr);
    const hoje = new Date();
    const dias = Math.floor((hoje.getTime() - d.getTime()) / 86400000);
    if (dias === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (dias === 1) return 'Ontem';
    if (dias < 7)  return `${dias} dias atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <aside className="w-[240px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-100">
        <h1 className="font-semibold text-slate-900 text-sm">Jarvis</h1>
      </div>

      {/* Botão nova conversa */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={onNew}
          className="w-full h-10 rounded-xl bg-purple-700 text-white text-sm font-medium flex items-center justify-center gap-2 shadow-sm hover:bg-purple-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova conversa
        </button>
      </div>

      {/* Modos especializados */}
      {subtabs.length > 0 && onSelectSubtab && (
        <div className="px-3 pb-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 mb-2">
            Especialistas
          </p>
          <div className="space-y-1.5">
            {subtabs.map(s => (
              <button
                key={s.id}
                onClick={() => onSelectSubtab(s.id, s.label)}
                className={cn(
                  'w-full rounded-xl text-xs font-semibold px-3 py-2.5 flex items-center gap-2.5 border transition-all text-left',
                  activeSubtabId === s.id
                    ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100 hover:border-purple-200'
                )}
              >
                <span className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  activeSubtabId === s.id ? 'bg-white/70' : 'bg-purple-400'
                )} />
                <span className="leading-snug">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Label */}
      <div className="px-4 pb-1.5 pt-1">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Modo Conversacional
        </span>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : conversas.length === 0 ? (
          <div className="text-center py-8 px-3">
            <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Nenhuma conversa ainda</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {conversas.map(conv => (
              <li key={conv.id}>
                <div
                  className={cn(
                    'group relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer border transition-all',
                    activeConversationId === conv.id
                      ? 'bg-purple-50 border-purple-100 shadow-sm'
                      : 'border-transparent hover:bg-slate-50'
                  )}
                  onClick={() => onSelect(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <MessageSquare className={cn(
                    'w-3.5 h-3.5 mt-0.5 flex-shrink-0',
                    activeConversationId === conv.id ? 'text-purple-600' : 'text-slate-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate leading-snug">
                      {conv.titulo ?? 'Conversa sem título'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatarData(conv.updated_at)}
                    </p>
                  </div>

                  {(hoveredId === conv.id || deletandoId === conv.id) && (
                    <button
                      className="flex-shrink-0 p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors"
                      title="Deletar conversa"
                      onClick={e => {
                        e.stopPropagation();
                        setConfirmId(conv.id);
                      }}
                    >
                      {deletandoId === conv.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />
                      }
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer — créditos */}
      {creditosRestantes !== undefined && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Créditos Jarvis</span>
            <strong className="text-base font-bold text-purple-700">{creditosRestantes}</strong>
          </div>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog
        open={!!confirmDeletarId}
        onOpenChange={open => { if (!open) setConfirmId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. A conversa e todas as mensagens serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => confirmDeletarId && handleDeletar(confirmDeletarId)}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
