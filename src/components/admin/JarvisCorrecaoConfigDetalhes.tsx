import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  configId: string;
}

export const JarvisCorrecaoConfigDetalhes = ({ configId }: Props) => {
  const { data: config, isLoading } = useQuery({
    queryKey: ["jarvis-correcao-config", configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jarvis_correcao_config")
        .select("*")
        .eq("id", configId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: analise } = useQuery({
    queryKey: ["jarvis-correcao-config-analise", configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_analise_config_correcao")
        .select("*")
        .eq("config_id", configId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // Ignore "not found"
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return <div>Configuração não encontrada</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-2xl font-bold">v{config.versao}</h2>
          {config.ativo ? (
            <Badge className="bg-green-500">Ativa</Badge>
          ) : (
            <Badge variant="outline">Inativa</Badge>
          )}
        </div>
        <p className="text-lg font-medium">{config.nome}</p>
        {config.descricao && (
          <p className="text-muted-foreground">{config.descricao}</p>
        )}
      </div>

      {/* Estatísticas (se houver correções) */}
      {analise && (
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total de Correções</p>
                <p className="text-2xl font-bold">{analise.total_correcoes}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média de Nota</p>
                <p className="text-2xl font-bold">
                  {Number(analise.media_nota || 0).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média de Tokens</p>
                <p className="text-2xl font-bold">{analise.media_tokens || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-2xl font-bold">
                  ${Number(analise.custo_total_usd || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {analise.media_c1 && (
              <div className="mt-6">
                <p className="text-sm font-medium mb-2">Média por Competência</p>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">C1</p>
                    <p className="font-bold">{Number(analise.media_c1).toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">C2</p>
                    <p className="font-bold">{Number(analise.media_c2).toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">C3</p>
                    <p className="font-bold">{Number(analise.media_c3).toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">C4</p>
                    <p className="font-bold">{Number(analise.media_c4).toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">C5</p>
                    <p className="font-bold">{Number(analise.media_c5).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuração Técnica */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração Técnica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Provider</p>
              <p className="font-medium">{config.provider}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Modelo</p>
              <p className="font-medium font-mono text-sm">{config.model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Temperatura</p>
              <p className="font-medium">{config.temperatura}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Tokens</p>
              <p className="font-medium">{config.max_tokens}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Custo em Créditos</p>
              <p className="font-medium">{config.custo_creditos}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Custo Estimado (USD)</p>
              <p className="font-medium">
                ${Number(config.custo_estimado_usd || 0).toFixed(4)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calibração Pedagógica */}
      {config.calibracao_pedagogica && (
        <Card>
          <CardHeader>
            <CardTitle>Calibração Pedagógica</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-64 whitespace-pre-wrap">
              {config.calibracao_pedagogica}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="system">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="system">System Prompt</TabsTrigger>
              <TabsTrigger value="user">User Template</TabsTrigger>
              <TabsTrigger value="schema">Response Schema</TabsTrigger>
            </TabsList>

            <TabsContent value="system">
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                {config.system_prompt}
              </pre>
            </TabsContent>

            <TabsContent value="user">
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                {config.user_prompt_template}
              </pre>
            </TabsContent>

            <TabsContent value="schema">
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96">
                {JSON.stringify(config.response_schema, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Metadados */}
      <Card>
        <CardHeader>
          <CardTitle>Metadados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Criada em:</span>
            <span className="font-medium">
              {format(new Date(config.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
          {config.ativado_em && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ativada em:</span>
              <span className="font-medium">
                {format(new Date(config.ativado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}
          {config.notas && (
            <div className="mt-4">
              <p className="text-muted-foreground mb-1">Notas Internas:</p>
              <p className="text-sm bg-muted p-3 rounded-md">{config.notas}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
