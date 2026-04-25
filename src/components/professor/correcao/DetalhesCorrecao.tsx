import { JarvisCorrecao } from "@/hooks/useJarvisCorrecao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, AlertCircle, Copy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  correcao: JarvisCorrecao;
}

export const DetalhesCorrecao = ({ correcao }: Props) => {
  const correcaoIA = correcao.correcao_ia;

  const copiarTexto = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado!`);
  };

  if (correcao.status !== "corrigida" || !correcaoIA) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {correcao.status === "erro"
            ? `Erro ao processar: ${correcao.erro_mensagem}`
            : "Esta redação ainda não foi corrigida."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h3 className="text-2xl font-bold">{correcao.autor_nome}</h3>
        <p className="text-muted-foreground">{correcao.tema}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Corrigida em {format(new Date(correcao.corrigida_em!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      {/* Nota Total */}
      <Card className="border-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-center">Nota Final</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-6xl font-bold text-primary">
              {correcao.nota_total}
            </div>
            <div className="text-2xl text-muted-foreground">/1000</div>
          </div>
        </CardContent>
      </Card>

      {/* Competências */}
      <Card>
        <CardHeader>
          <CardTitle>Notas por Competência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {["c1", "c2", "c3", "c4", "c5"].map((comp) => {
              const competencia = correcaoIA.competencias[comp];
              return (
                <div key={comp} className="text-center p-4 border rounded-lg">
                  <div className="text-xs text-muted-foreground mb-2">
                    Competência {comp.replace("c", "")}
                  </div>
                  <div className="text-3xl font-bold">{competencia.nota}</div>
                  <div className="text-sm text-muted-foreground">/200</div>
                  <Separator className="my-3" />
                  <p className="text-xs text-left">{competencia.justificativa}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Erros, Análise, Texto Lapidado */}
      <Tabs defaultValue="erros">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="erros">
            Erros ({correcaoIA.erros?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="estrutura">Estrutura</TabsTrigger>
          <TabsTrigger value="lapidado">Versão Lapidada</TabsTrigger>
          <TabsTrigger value="original">Texto Original</TabsTrigger>
        </TabsList>

        <TabsContent value="erros" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Erros Identificados</CardTitle>
            </CardHeader>
            <CardContent>
              {correcaoIA.erros && correcaoIA.erros.length > 0 ? (
                <div className="space-y-4">
                  {correcaoIA.erros.map((erro: any) => (
                    <div key={erro.numero} className="border-l-4 border-red-500 pl-4 py-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="destructive">{erro.numero}</Badge>
                        <div className="flex-1">
                          <p className="font-medium">{erro.tipo}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {erro.descricao}
                          </p>
                          {erro.trecho_original && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                              <p className="font-medium text-xs text-red-700 mb-1">
                                Trecho original:
                              </p>
                              <p className="italic">"{erro.trecho_original}"</p>
                            </div>
                          )}
                          {erro.sugestao && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                              <p className="font-medium text-xs text-green-700 mb-1">
                                Sugestão:
                              </p>
                              <p>{erro.sugestao}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum erro identificado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sugestões Objetivas */}
          {correcaoIA.sugestoes_objetivas && correcaoIA.sugestoes_objetivas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sugestões para Melhoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {correcaoIA.sugestoes_objetivas.map((sugestao: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{sugestao}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="estrutura">
          <Card>
            <CardHeader>
              <CardTitle>Análise Estrutural</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {correcaoIA.estrutura.possui_tese ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">Tese</span>
                </div>
                <p className="text-sm pl-7">
                  {correcaoIA.estrutura.tese_identificada || "Não identificada"}
                </p>
              </div>

              <Separator />

              <div>
                <p className="font-medium mb-2">Argumentos</p>
                <ul className="space-y-2 pl-7">
                  {correcaoIA.estrutura.argumentos?.map((arg: string, index: number) => (
                    <li key={index} className="text-sm list-disc">
                      {arg}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <p className="font-medium mb-2">Uso de Repertório</p>
                <p className="text-sm pl-7">{correcaoIA.estrutura.uso_repertorio}</p>
              </div>

              <Separator />

              <div>
                <p className="font-medium mb-2">Proposta de Intervenção</p>
                <p className="text-sm pl-7">{correcaoIA.estrutura.proposta_intervencao}</p>
              </div>

              {correcaoIA.resumo_geral && (
                <>
                  <Separator />
                  <div>
                    <p className="font-medium mb-2">Resumo Geral</p>
                    <p className="text-sm pl-7">{correcaoIA.resumo_geral}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lapidado">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Versão Lapidada</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copiarTexto(correcaoIA.versao_lapidada, "Versão lapidada")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{correcaoIA.versao_lapidada}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="original">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Texto Original</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copiarTexto(
                      correcao.transcricao_confirmada || "",
                      "Texto original"
                    )
                  }
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{correcao.transcricao_confirmada}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Metadados Técnicos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informações Técnicas</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1 text-muted-foreground">
          <p>Configuração: v{correcao.config_versao}</p>
          <p>Modelo: {correcao.modelo_ia}</p>
          <p>Tokens: {correcao.tokens_total}</p>
          {correcao.tempo_processamento_ms && (
            <p>Tempo: {(correcao.tempo_processamento_ms / 1000).toFixed(2)}s</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
