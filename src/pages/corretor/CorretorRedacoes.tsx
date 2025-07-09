import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { ListaRedacoesCorretor } from "@/components/corretor/ListaRedacoesCorretor";
import { FormularioCorrecaoCompleto } from "@/components/corretor/FormularioCorrecaoCompleto";
import { RedacaoCorretor, useCorretorRedacoes } from "@/hooks/useCorretorRedacoes";

const CorretorRedacoes = () => {
  const { corretor, loading } = useCorretorAuth();
  const [redacaoSelecionada, setRedacaoSelecionada] = useState<RedacaoCorretor | null>(null);
  
  // Usar o hook para ter acesso à função de refresh
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

  const handleCorrigirRedacao = (redacao: RedacaoCorretor) => {
    setRedacaoSelecionada(redacao);
  };

  const handleVoltarLista = () => {
    setRedacaoSelecionada(null);
  };

  const handleSucessoCorrecao = () => {
    setRedacaoSelecionada(null);
    // Atualizar a lista após correção
    refreshRedacoes();
  };

  return (
    <CorretorLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 break-words">
            Redações
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie suas correções pendentes, incompletas e finalizadas
          </p>
        </div>

        {redacaoSelecionada ? (
          <FormularioCorrecaoCompleto
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