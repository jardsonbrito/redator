
import { useState } from "react";
import { useCorretorAuth } from "@/hooks/useCorretorAuth";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";
import { MuralAvisosCorretor } from "@/components/corretor/MuralAvisosCorretor";
import { ListaRedacoesCorretor } from "@/components/corretor/ListaRedacoesCorretor";
import { FormularioCorrecao } from "@/components/corretor/FormularioCorrecao";
import { RedacaoCorretor } from "@/hooks/useCorretorRedacoes";

const CorretorHome = () => {
  const { corretor } = useCorretorAuth();
  const [redacaoSelecionada, setRedacaoSelecionada] = useState<RedacaoCorretor | null>(null);

  if (!corretor) {
    return <div>Carregando...</div>;
  }

  const handleCorrigir = (redacao: RedacaoCorretor) => {
    setRedacaoSelecionada(redacao);
  };

  const handleVoltar = () => {
    setRedacaoSelecionada(null);
  };

  const handleSucesso = () => {
    setRedacaoSelecionada(null);
    // Aqui poderia atualizar a lista de redações
  };

  if (redacaoSelecionada) {
    return (
      <CorretorLayout>
        <FormularioCorrecao
          redacao={redacaoSelecionada}
          corretorEmail={corretor.email}
          onVoltar={handleVoltar}
          onSucesso={handleSucesso}
        />
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bem-vindo(a), {corretor.nome_completo}!</h1>
          <p className="text-muted-foreground">
            Gerencie suas correções e acompanhe os avisos importantes.
          </p>
        </div>

        <MuralAvisosCorretor corretorId={corretor.id} />
        
        <ListaRedacoesCorretor 
          corretorEmail={corretor.email} 
          onCorrigir={handleCorrigir}
        />
      </div>
    </CorretorLayout>
  );
};

export default CorretorHome;
