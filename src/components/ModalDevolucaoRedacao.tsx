import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

  console.log('🟡 Modal: Renderizando modal com isOpen:', isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-2 pb-2">
          <DialogTitle className="text-2xl font-semibold text-[#374151]">
            Redação devolvida
          </DialogTitle>
          <p className="text-[15px] text-[#6b7280] italic">
            "{redacao.frase_tematica}"
          </p>
        </DialogHeader>

        <div className="py-4">
          <p className="text-[14px] font-semibold text-[#6b7280] mb-3">
            Orientação do corretor
          </p>
          <div className="border-l-4 border-yellow-400 px-[18px] py-4 bg-white">
            <p className="text-[15px] text-[#374151] leading-[1.8]">
              {redacao.justificativa_devolucao || 'Nenhuma orientação registrada.'}
            </p>
          </div>

          {jaVisualizou && (
            <p className="text-sm text-green-600 text-center mt-4">
              Marcado como ciente com sucesso.
            </p>
          )}
        </div>

        <div className="mt-[28px] flex justify-center">
          <Button
            onClick={(e) => {
              console.log('🟡 Modal: Botão clicado!', e);
              console.log('🟡 Modal: Estado antes do clique:', { isRegistrando, jaVisualizou });
              e.preventDefault();
              e.stopPropagation();
              handleEntendi();
            }}
            disabled={isRegistrando}
            className="px-[34px] py-3 rounded-[10px] font-medium"
          >
            {isRegistrando ? 'Registrando...' : 'Entendi'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}