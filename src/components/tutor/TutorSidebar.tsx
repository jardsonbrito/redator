import { useState } from 'react';
import { Plus, Archive, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JarvisIcon } from '@/components/icons/JarvisIcon';
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

interface TutorSidebarProps {
  conversas:            TutorConversa[];
  loading:              boolean;
  activeConversationId: string | null;
  onSelect:             (id: string) => void;
  onNew:                () => void;
  onArquivar:           (id: string) => Promise<void>;
}

export function TutorSidebar({
  conversas,
  loading,
  activeConversationId,
  onSelect,
  onNew,
  onArquivar,
}: TutorSidebarProps) {
  const [hoveredId, setHoveredId]               = useState<string | null>(null);
  const [arquivandoId, setArquivandoId]          = useState<string | null>(null);
  const [confirmArquivarId, setConfirmArquivarId] = useState<string | null>(null);

  const handleArquivar = async (id: string) => {
    setArquivandoId(id);
    try {
      await onArquivar(id);
    } finally {
      setArquivandoId(null);
      setConfirmArquivarId(null);
    }
  };

  const formatarData = (dateStr: string) => {
    const d = new Date(dateStr);
    const hoje = new Date();
    const diff = hoje.getTime() - d.getTime();
    const dias = Math.floor(diff / 86400000);

    if (dias === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (dias === 1) return 'Ontem';
    if (dias < 7)  return `${dias} dias atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200 flex items-center gap-2">
        <div className="w-6 h-6 flex-shrink-0">
          <JarvisIcon />
        </div>
        <span className="font-semibold text-gray-800 text-sm">Tutor Jarvis</span>
      </div>

      {/* Botão nova conversa */}
      <div className="px-3 py-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
          onClick={onNew}
        >
          <Plus className="w-4 h-4" />
          Nova conversa
        </Button>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : conversas.length === 0 ? (
          <div className="text-center py-8 px-3">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Nenhuma conversa ainda</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {conversas.map(conv => (
              <li key={conv.id}>
                <div
                  className={cn(
                    'group relative flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors',
                    activeConversationId === conv.id
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'hover:bg-gray-100 text-gray-700'
                  )}
                  onClick={() => onSelect(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-snug">
                      {conv.titulo ?? 'Conversa sem título'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatarData(conv.updated_at)}
                    </p>
                  </div>

                  {/* Botão arquivar — aparece no hover */}
                  {(hoveredId === conv.id || arquivandoId === conv.id) && (
                    <button
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Arquivar conversa"
                      onClick={e => {
                        e.stopPropagation();
                        setConfirmArquivarId(conv.id);
                      }}
                    >
                      {arquivandoId === conv.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Archive className="w-3.5 h-3.5" />
                      }
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialog de confirmação de arquivamento */}
      <AlertDialog
        open={!!confirmArquivarId}
        onOpenChange={open => { if (!open) setConfirmArquivarId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa será arquivada e não aparecerá mais na lista. O histórico não é excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmArquivarId && handleArquivar(confirmArquivarId)}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
