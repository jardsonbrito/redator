import { useState, useEffect } from 'react';
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
    ja_visualizada?: boolean;
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
  const [jaVisualizou, setJaVisualizou] = useState(redacao.ja_visualizada || false);

  // Atualizar estado quando as props mudarem
  useEffect(() => {
    setJaVisualizou(redacao.ja_visualizada || false);
  }, [redacao.ja_visualizada]);

  console.log('🟡 Modal: Props recebidas:', {
    isOpen,
    redacao,
    emailAluno,
    corretorNome,
    isRegistrando,
    justificativa_devolucao: redacao.justificativa_devolucao,
    ja_visualizada: redacao.ja_visualizada,
    jaVisualizou
  });

  const handleEntendi = async () => {
    // Se já foi visualizada, apenas fechar o modal
    if (redacao.ja_visualizada) {
      console.log('🟡 Modal: Redação já foi visualizada, apenas fechando modal');
      onClose();
      return;
    }
    
    console.log('🟡 Modal: Iniciando handleEntendi', {
      redacao_id: redacao.id,
      tabela_origem: redacao.tabela_origem,
      email_aluno: emailAluno
    });
    
    try {
      const resultado = await registrarVisualizacao({
        redacao_id: redacao.id,
        tabela_origem: redacao.tabela_origem,
        email_aluno: emailAluno
      });
      
      console.log('🟡 Modal: Resultado do registro:', resultado);

      if (resultado.success) {
        console.log('🟡 Modal: Sucesso! Marcando como visualizado');
        setJaVisualizou(true);
        
        // Fechar modal após 2s para dar tempo do usuário ver o feedback
        setTimeout(() => {
          console.log('🟡 Modal: Fechando modal');
          onClose();
          // Não recarregar a página - o sistema realtime vai atualizar
        }, 2000);
      } else {
        console.error('🟡 Modal: Falha no registro:', resultado);
      }
    } catch (error) {
      console.error('🟡 Modal: Erro no handleEntendi:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  console.log('🟡 Modal: Renderizando modal com isOpen:', isOpen);

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

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-blue-800 dark:text-blue-200 text-sm flex items-start gap-2">
              <span className="text-base">💡</span>
              <span>
                <strong>Próximos passos:</strong> Corrija os pontos indicados 
                e reenvie sua redação para nova avaliação.
              </span>
            </p>
          </div>
          
          {/* Mensagem de sucesso */}
          {jaVisualizou && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 text-center">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Marcado como ciente com sucesso!</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                O corretor foi notificado que você visualizou a devolução.
              </p>
            </div>
          )}
          
          <div className="flex justify-center pt-2">
            <Button 
              onClick={(e) => {
                console.log('🟡 Modal: Botão clicado!', e);
                console.log('🟡 Modal: Estado antes do clique:', { isRegistrando, jaVisualizou });
                e.preventDefault();
                e.stopPropagation();
                handleEntendi();
              }}
              disabled={isRegistrando}
              className={`
                px-8 py-3 text-base font-medium transition-all
                ${jaVisualizou 
                  ? 'bg-primary hover:bg-primary/90' 
                  : isRegistrando
                    ? 'bg-primary/50 hover:bg-primary/50 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90'
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