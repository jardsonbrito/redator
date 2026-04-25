import { useState } from "react";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { useJarvisCorrecao } from "@/hooks/useJarvisCorrecao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bot, Upload, History, Coins } from "lucide-react";
import { EnviarRedacaoForm } from "@/components/professor/correcao/EnviarRedacaoForm";
import { HistoricoCorrecoes } from "@/components/professor/correcao/HistoricoCorrecoes";

export const ProfessorJarvisCorrecao = () => {
  const { professor } = useProfessorAuth();
  const { creditos, correcoes, isLoading } = useJarvisCorrecao(professor?.email || "");
  const [activeTab, setActiveTab] = useState("enviar");

  if (!professor) {
    return <div>Carregando...</div>;
  }

  const correcoesAguardando = correcoes?.filter(
    (c) => c.status === "revisao_ocr" || c.status === "aguardando_correcao"
  ).length || 0;

  const correcoesFinalizadas = correcoes?.filter((c) => c.status === "corrigida").length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          Jarvis - Correção Inteligente
        </h1>
        <p className="text-muted-foreground mt-2">
          Sistema de correção automática de redações com IA
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Créditos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {creditos !== undefined ? creditos : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              1 crédito = 1 correção completa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aguardando Revisão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {correcoesAguardando}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Redações pendentes de confirmação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Correções Finalizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {correcoesFinalizadas}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de redações corrigidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="enviar" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Enviar Nova Redação
            {correcoesAguardando > 0 && (
              <Badge variant="destructive" className="ml-2">
                {correcoesAguardando}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enviar" className="mt-6">
          <EnviarRedacaoForm professorEmail={professor.email} />
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <HistoricoCorrecoes professorEmail={professor.email} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
