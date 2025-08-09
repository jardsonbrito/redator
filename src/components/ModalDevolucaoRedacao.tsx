import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useVisualizacaoRedacao } from '@/hooks/useVisualizacaoRedacao';

interface ModalDevolucaoProps {
  isOpen: boolean;
  onClose: () => void;
  redacao: {
    id: string;
    frase_tematica: string;
    tabela_origem: string;
    justificativa_devolucao?: string;
    data_envio: string;
  };
  emailAluno: string;
  corretorNome?: string;
}

export function ModalDevolucaoRedacao({
  isOpen,
  onClose,
  redacao,
  emailAluno,
  corretorNome = "Corretor"
}: ModalDevolucaoProps) {
  const { registrarVisualizacao, isRegistrando } = useVisualizacaoRedacao();
  const [jaVisualizou, setJaVisualizou] = useState(false);

  const handleEntendi = async () => {
    const resultado = await registrarVisualizacao({
      redacao_id: redacao.id,
      tabela_origem: redacao.tabela_origem,
      email_aluno: emailAluno
    });

    if (resultado.success) {
      setJaVisualizou(true);
      
      // Fechar modal após 2s para dar tempo do usuário ver o feedback
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

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
          <DialogTitle className="text-xl font-semibold text-center text-red-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Redação Devolvida
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            {redacao.frase_tematica}
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Enviado em: {formatDate(redacao.data_envio)}
          </p>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Segundo {corretorNome.toLowerCase().endsWith('a') ? 'a corretora' : 'o corretor'}{' '}
                  <span className="font-semibold">{corretorNome}</span>, sua redação foi devolvida 
                  com base na seguinte justificativa:
                </p>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded border-l-4 border-yellow-400">
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    "{redacao.justificativa_devolucao || 'Motivo não especificado'}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-blue-800 dark:text-blue-200 text-sm flex items-start gap-2">
              <span className="text-base">💡</span>
              <span>
                <strong>Próximos passos:</strong> Corrija os pontos indicados 
                e reenvie sua redação para nova avaliação.
              </span>
            </p>
          </div>
          
          <div className="flex justify-center pt-2">
            <Button 
              onClick={handleEntendi}
              disabled={isRegistrando || jaVisualizou}
              className={`
                px-8 py-3 text-base font-medium transition-all
                ${jaVisualizou 
                  ? 'bg-green-600 hover:bg-green-600 cursor-not-allowed' 
                  : isRegistrando
                    ? 'bg-blue-400 hover:bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }
              `}
            >
              {jaVisualizou ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Marcado como Ciente</>
              ) : isRegistrando ? (
                <>⏳ Registrando...</>
              ) : (
                <>👍 Entendi</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}