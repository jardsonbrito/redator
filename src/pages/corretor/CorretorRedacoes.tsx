
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { ListaRedacoesCorretor } from "@/components/corretor/ListaRedacoesCorretor";
import { FormularioCorrecaoCompletoComAnotacoes } from "@/components/corretor/FormularioCorrecaoCompletoComAnotacoes";
import { RedacaoCorretor, useCorretorRedacoes } from "@/hooks/useCorretorRedacoes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CorretorRedacoes = () => {
  const { corretor, loading } = useCorretorAuth();
  const [redacaoSelecionada, setRedacaoSelecionada] = useState<RedacaoCorretor | null>(null);
  const { toast } = useToast();
  
  const { refreshRedacoes } = useCorretorRedacoes(corretor?.email || '');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!corretor) {
    return <Navigate to="/corretor/login" replace />;
  }

  const handleCorrigirRedacao = async (redacao: RedacaoCorretor) => {
    console.log('🔍 Iniciando correção da redação:', redacao.id);
    
    try {
      // Marcar redação como "em_correcao" ao iniciar correção
      if (redacao.status_minha_correcao === 'pendente') {
        console.log('📝 Marcando redação como "em_correcao"...');
        
        const tabela = redacao.tipo_redacao === 'regular' ? 'redacoes_enviadas' : 
                      redacao.tipo_redacao === 'simulado' ? 'redacoes_simulado' : 'redacoes_exercicio';
        
        const { error } = await supabase.rpc('iniciar_correcao_redacao', {
          redacao_id: redacao.id,
          tabela_nome: tabela,
          corretor_email: corretor?.email || ''
        });
        
        if (error) {
          console.error('❌ Erro ao iniciar correção:', error);
          toast({
            title: "Erro",
            description: "Não foi possível iniciar a correção.",
            variant: "destructive"
          });
          return;
        }
        
        console.log('✅ Redação marcada como "em_correcao"');
        // Atualizar a lista para refletir o novo status
        refreshRedacoes();
      }
      
      setRedacaoSelecionada(redacao);
    } catch (error: any) {
      console.error('❌ Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleVoltarLista = () => {
    setRedacaoSelecionada(null);
  };

  const handleSucessoCorrecao = () => {
    setRedacaoSelecionada(null);
    refreshRedacoes();
  };

  return (
    <CorretorLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 break-words">
            Redações com Sistema de Correção Visual
          </h1>
        </div>

        {redacaoSelecionada ? (
          <FormularioCorrecaoCompletoComAnotacoes
            redacao={redacaoSelecionada}
            corretorEmail={corretor.email}
            onVoltar={handleVoltarLista}
            onSucesso={handleSucessoCorrecao}
            onRefreshList={refreshRedacoes}
          />
        ) : (
          <ListaRedacoesCorretor
            corretorEmail={corretor.email}
            onCorrigir={handleCorrigirRedacao}
          />
        )}
      </div>
    </CorretorLayout>
  );
};

export default CorretorRedacoes;
