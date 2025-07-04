
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCorretorRedacoes, RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { Clock, FileText, CheckCircle } from "lucide-react";

interface ListaRedacoesCorretorProps {
  corretorEmail: string;
  onCorrigir: (redacao: RedacaoCorretor) => void;
}

export const ListaRedacoesCorretor = ({ corretorEmail, onCorrigir }: ListaRedacoesCorretorProps) => {
  const { loading, getRedacoesPorStatus } = useCorretorRedacoes(corretorEmail);

  if (loading) {
    return <div>Carregando redações...</div>;
  }

  const { pendentes, incompletas, corrigidas } = getRedacoesPorStatus();

  const RedacaoItem = ({ redacao, index }: { redacao: RedacaoCorretor; index: number }) => (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-lg">#{index + 1}</span>
            <Badge variant="outline">{redacao.tipo_redacao}</Badge>
          </div>
          
          <h3 className="font-medium text-base mb-1">{redacao.nome_aluno}</h3>
          <p className="text-sm text-muted-foreground mb-2">{redacao.frase_tematica}</p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(redacao.data_envio).toLocaleString('pt-BR')}
          </div>
        </div>
        
        <div className="ml-4">
          <Button
            onClick={() => onCorrigir(redacao)}
            variant={redacao.status_minha_correcao === 'corrigida' ? 'outline' : 'default'}
            size="sm"
          >
            {redacao.status_minha_correcao === 'pendente' && 'Corrigir'}
            {redacao.status_minha_correcao === 'incompleta' && 'Continuar'}
            {redacao.status_minha_correcao === 'corrigida' && 'Ver correção'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Minhas Redações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pendentes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pendentes" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({pendentes.length})
            </TabsTrigger>
            <TabsTrigger value="incompletas" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Incompletas ({incompletas.length})
            </TabsTrigger>
            <TabsTrigger value="corrigidas" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Corrigidas ({corrigidas.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pendentes" className="mt-4">
            {pendentes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma redação pendente no momento.
              </p>
            ) : (
              <div className="space-y-3">
                {pendentes.map((redacao, index) => (
                  <RedacaoItem key={redacao.id} redacao={redacao} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="incompletas" className="mt-4">
            {incompletas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma correção incompleta.
              </p>
            ) : (
              <div className="space-y-3">
                {incompletas.map((redacao, index) => (
                  <RedacaoItem key={redacao.id} redacao={redacao} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="corrigidas" className="mt-4">
            {corrigidas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma redação corrigida ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {corrigidas.map((redacao, index) => (
                  <RedacaoItem key={redacao.id} redacao={redacao} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
