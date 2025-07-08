
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRedacoesEnviadas, RedacaoEnviada } from "@/hooks/useRedacoesEnviadas";
import { RedacaoViewForm } from "./RedacaoViewForm";
import { RedacaoListTable } from "./RedacaoListTable";

export const RedacaoEnviadaForm = () => {
  const {
    redacoes,
    loading,
    searchTerm,
    setSearchTerm,
    fetchRedacoes,
    handleDeleteRedacao
  } = useRedacoesEnviadas();

  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoEnviada | null>(null);

  const handleView = (redacao: RedacaoEnviada) => {
    setSelectedRedacao(redacao);
  };

  const handleCancelView = () => {
    setSelectedRedacao(null);
  };

  if (selectedRedacao) {
    return (
      <RedacaoViewForm
        redacao={selectedRedacao}
        onCancel={handleCancelView}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Redações Enviadas - Visualização Gerencial
          <Badge variant="secondary">{redacoes.length} redação(ões)</Badge>
        </CardTitle>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome, e-mail, turma ou tema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Carregando redações...</div>
        ) : redacoes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? "Nenhuma redação encontrada com os critérios de busca." : "Nenhuma redação enviada ainda."}
          </div>
        ) : (
          <RedacaoListTable
            redacoes={redacoes}
            onView={handleView}
            onDelete={(redacao) => handleDeleteRedacao(redacao.id)}
            onRefresh={fetchRedacoes}
          />
        )}
      </CardContent>
    </Card>
  );
};
