import { Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconAction, ACTION_ICON } from '@/components/ui/icon-action';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TemaActionButtonsProps {
  tema: any;
  status: {
    type: 'published' | 'scheduled' | 'overdue' | 'draft';
    label: string;
    variant: string;
  };
  onEdit: () => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onPublishNow: (id: string) => void;
  onCancelScheduling: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TemaActionButtons = ({
  tema,
  status,
  onEdit,
  onToggleStatus,
  onPublishNow,
  onCancelScheduling,
  onDelete
}: TemaActionButtonsProps) => {
  return (
    <>
      {/* Mobile version - Icons only */}
      <div className="flex items-center gap-3 sm:hidden">
        <button
          aria-label="Editar tema"
          onClick={onEdit}
          className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-violet-500 text-violet-600 active:scale-[0.98] hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-all duration-200"
        >
          <ACTION_ICON.editar className="w-5 h-5" />
        </button>

        {(() => {
          if (status.type === 'scheduled') {
            return (
              <>
                <button
                  aria-label="Publicar agora"
                  onClick={() => onPublishNow(tema.id)}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-green-500 text-green-600 active:scale-[0.98] hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-all duration-200"
                >
                  <ACTION_ICON.publicar className="w-5 h-5" />
                </button>
                <button
                  aria-label="Cancelar agendamento"
                  onClick={() => onCancelScheduling(tema.id)}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-slate-300 text-slate-600 active:scale-[0.98] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-all duration-200"
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </>
            );
          }
          
          if (status.type === 'overdue') {
            return (
              <button
                aria-label="Publicar agora (atrasado)"
                onClick={() => onPublishNow(tema.id)}
                className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-green-500 text-green-600 active:scale-[0.98] hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-all duration-200"
              >
                <ACTION_ICON.publicar className="w-5 h-5" />
              </button>
            );
          }
          
          return (
            <button
              aria-label={tema.status === 'publicado' ? 'Tornar rascunho' : 'Publicar'}
              onClick={() => onToggleStatus(tema.id, tema.status || 'publicado')}
              className={`w-10 h-10 inline-flex items-center justify-center rounded-full border active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 transition-all duration-200 ${
                tema.status === 'publicado' 
                  ? 'border-slate-300 text-slate-600 hover:bg-slate-50 focus-visible:ring-slate-400'
                  : 'border-green-500 text-green-600 hover:bg-green-50 focus-visible:ring-green-500'
              }`}
            >
              {tema.status === 'publicado' ? (
                <ACTION_ICON.rascunho className="w-5 h-5" />
              ) : (
                <ACTION_ICON.publicar className="w-5 h-5" />
              )}
            </button>
          );
        })()}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              aria-label="Excluir tema"
              className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-red-500 text-red-600 active:scale-[0.98] hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-all duration-200"
            >
              <ACTION_ICON.excluir className="w-5 h-5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md mx-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Confirmar Exclusão Permanente
              </AlertDialogTitle>
              <AlertDialogDescription>
                <strong>ATENÇÃO:</strong> Esta ação é irreversível! O tema será removido permanentemente do banco de dados e não poderá ser recuperado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(tema.id)}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                Excluir Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Desktop version - Full buttons with text */}
      <div className="hidden sm:flex flex-col sm:flex-row gap-2 sm:gap-3">
        <IconAction
          icon={ACTION_ICON.editar}
          label="Editar"
          intent="neutral"
          onClick={onEdit}
          className="flex-1 sm:flex-none justify-center sm:justify-start"
        />

        {(() => {
          if (status.type === 'scheduled') {
            return (
              <>
                <IconAction
                  icon={ACTION_ICON.publicar}
                  label="Publicar Agora"
                  intent="positive"
                  onClick={() => onPublishNow(tema.id)}
                  className="flex-1 sm:flex-none justify-center sm:justify-start"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancelScheduling(tema.id)}
                  className="flex-1 sm:flex-none"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Cancelar Agendamento
                </Button>
              </>
            );
          }
          
          if (status.type === 'overdue') {
            return (
              <IconAction
                icon={ACTION_ICON.publicar}
                label="Publicar Agora (Atrasado)"
                intent="positive"
                onClick={() => onPublishNow(tema.id)}
                className="flex-1 sm:flex-none justify-center sm:justify-start"
              />
            );
          }
          
          return (
            <IconAction
              icon={tema.status === 'publicado' ? ACTION_ICON.rascunho : ACTION_ICON.publicar}
              label={tema.status === 'publicado' ? 'Tornar Rascunho' : 'Publicar'}
              intent={tema.status === 'publicado' ? 'neutral' : 'positive'}
              onClick={() => onToggleStatus(tema.id, tema.status || 'publicado')}
              className="flex-1 sm:flex-none justify-center sm:justify-start"
              asSwitch
              checked={tema.status === 'publicado'}
            />
          );
        })()}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <IconAction
              icon={ACTION_ICON.excluir}
              label="Excluir"
              intent="danger"
              className="flex-1 sm:flex-none justify-center sm:justify-start"
            />
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md mx-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Confirmar Exclusão Permanente
              </AlertDialogTitle>
              <AlertDialogDescription>
                <strong>ATENÇÃO:</strong> Esta ação é irreversível! O tema será removido permanentemente do banco de dados e não poderá ser recuperado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(tema.id)}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                Excluir Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};