
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCorretorRedacoes, RedacaoCorretor } from "@/hooks/useCorretorRedacoes";
import { Clock, FileText, CheckCircle, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ListaRedacoesCorretorProps {
  corretorEmail: string;
  onCorrigir: (redacao: RedacaoCorretor) => void;
}

export const ListaRedacoesCorretor = ({ corretorEmail, onCorrigir }: ListaRedacoesCorretorProps) => {
  const { loading, getRedacoesPorStatus } = useCorretorRedacoes(corretorEmail);
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { pendentes, incompletas, corrigidas } = getRedacoesPorStatus();

  const RedacaoItem = ({ redacao, index }: { redacao: RedacaoCorretor; index: number }) => (
    <div className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-semibold text-sm sm:text-lg">#{index + 1}</span>
            <Badge variant="outline" className="text-xs">
              {redacao.tipo_redacao === 'regular' ? 'Regular' : 
               redacao.tipo_redacao === 'simulado' ? 'Simulado' : 
               redacao.tipo_redacao === 'exercicio' ? 'Exercício' : 
               redacao.tipo_redacao === 'avulsa' ? 'Livre' : redacao.tipo_redacao}
            </Badge>
          </div>
          
          <div className="flex items-start gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <h3 className="font-medium text-sm sm:text-base break-words">
              {redacao.nome_aluno}
            </h3>
          </div>
          
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2 break-words">
            {redacao.frase_tematica}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {new Date(redacao.data_envio).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                ...(isMobile ? {} : { hour: '2-digit', minute: '2-digit' })
              })}
            </span>
          </div>
        </div>
        
        <div className="shrink-0 w-full sm:w-auto">
          <Button
            onClick={() => onCorrigir(redacao)}
            variant={redacao.status_minha_correcao === 'corrigida' ? 'outline' : 'default'}
            size="sm"
            className="w-full sm:w-auto text-xs sm:text-sm"
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
      <CardContent>
        <Tabs defaultValue="pendentes" className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 gap-1 h-auto' : 'grid-cols-3'}`}>
            <TabsTrigger 
              value="pendentes" 
              className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${isMobile ? 'justify-start' : 'justify-center'}`}
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              Pendentes ({pendentes.length})
            </TabsTrigger>
            <TabsTrigger 
              value="incompletas" 
              className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${isMobile ? 'justify-start' : 'justify-center'}`}
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              Incompletas ({incompletas.length})
            </TabsTrigger>
            <TabsTrigger 
              value="corrigidas" 
              className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${isMobile ? 'justify-start' : 'justify-center'}`}
            >
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              Corrigidas ({corrigidas.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pendentes" className="mt-4">
            {pendentes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
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
              <p className="text-center text-muted-foreground py-8 text-sm">
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
              <p className="text-center text-muted-foreground py-8 text-sm">
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
