
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
    // Apenas abre a redação para correção sem alterar status
    // O status só mudará quando o corretor salvar algo efetivamente
    setRedacaoSelecionada(redacao);
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
            Painel de Correção
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
