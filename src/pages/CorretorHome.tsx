
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { ListaRedacoesCorretor } from "@/components/corretor/ListaRedacoesCorretor";
import { FormularioCorrecaoCompleto } from "@/components/corretor/FormularioCorrecaoCompleto";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";

const CorretorHome = () => {
  const { corretor, loading } = useCorretorAuth();
  const [redacaoSelecionada, setRedacaoSelecionada] = useState<RedacaoCorretor | null>(null);

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
  };

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {corretor.nome_completo}!
          </h1>
          <p className="text-gray-600 mt-2">
            Bem-vindo ao painel do corretor. Aqui você pode corrigir as redações atribuídas a você com a nova Vista Pedagógica.
          </p>
        </div>

        {redacaoSelecionada ? (
          <FormularioCorrecaoCompleto
            redacao={redacaoSelecionada}
            corretorEmail={corretor.email}
            onVoltar={handleVoltarLista}
            onSucesso={handleSucessoCorrecao}
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

export default CorretorHome;
