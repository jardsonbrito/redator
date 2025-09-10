import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Eye, AlertCircle } from 'lucide-react';

interface ModalRevisualizacaoProps {
  isOpen: boolean;
  onClose: () => void;
  redacao: {
    id: string;
    frase_tematica: string;
    justificativa_devolucao?: string;
    data_envio: string;
  };
}

export function ModalRevisualizacaoRedacao({
  isOpen,
  onClose,
  redacao
}: ModalRevisualizacaoProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold text-center text-green-600 flex items-center justify-center gap-2">
            <Eye className="w-6 h-6" />
            Motivo da Devolução
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            {redacao.frase_tematica}
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Enviado em: {formatDate(redacao.data_envio)}
          </p>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Justificativa */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Sua redação foi devolvida pelo corretor com a seguinte justificativa:
                </p>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded border-l-4 border-yellow-400">
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    "{redacao.justificativa_devolucao || 'Motivo não especificado'}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status ciente */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 text-center">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Você já está ciente desta devolução</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              O corretor foi notificado que você visualizou.
            </p>
          </div>
          
          <div className="flex justify-center pt-2">
            <Button 
              onClick={onClose}
              className="px-8 py-3 text-base font-medium bg-primary hover:bg-primary/90"
            >
              ✓ Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}