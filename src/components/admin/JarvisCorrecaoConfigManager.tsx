import { useState } from "react";
import { useJarvisCorrecaoConfig } from "@/hooks/useJarvisCorrecaoConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Power, Copy, Eye, Edit, Trash2, TrendingUp } from "lucide-react";
import { JarvisCorrecaoConfigForm } from "./JarvisCorrecaoConfigForm";
import { JarvisCorrecaoConfigDetalhes } from "./JarvisCorrecaoConfigDetalhes";
import { toast } from "sonner";

export const JarvisCorrecaoConfigManager = () => {
  const {
    configs,
    configAtiva,
    analiseConfigs,
    isLoading,
    ativarConfig,
    duplicarConfig,
    deletarConfig,
  } = useJarvisCorrecaoConfig();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetalhesDialog, setShowDetalhesDialog] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [configToActivate, setConfigToActivate] = useState<string | null>(null);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  const handleAtivar = (configId: string) => {
    setConfigToActivate(configId);
  };

  const confirmAtivar = () => {
    if (configToActivate) {
      ativarConfig.mutate(configToActivate);
      setConfigToActivate(null);
    }
  };

  const handleDuplicar = (configId: string) => {
    const config = configs?.find((c) => c.id === configId);
    if (config) {
      duplicarConfig.mutate({
        configId,
        novoNome: `${config.nome} (cópia)`,
      });
    }
  };

  const handleVisualizar = (configId: string) => {
    setSelectedConfigId(configId);
    setShowDetalhesDialog(true);
  };

  const handleDelete = (configId: string) => {
    setConfigToDelete(configId);
  };

  const confirmDelete = () => {
    if (configToDelete) {
      deletarConfig.mutate(configToDelete);
      setConfigToDelete(null);
    }
  };

  const getAnaliseConfig = (configId: string) => {
    return analiseConfigs?.find((a: any) => a.config_id === configId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Gerenciamento de Configurações - Jarvis Correção
              </CardTitle>
              <CardDescription>
                Controle total sobre prompts, modelos e parâmetros da IA.
                Apenas UMA configuração pode estar ativa por vez.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Configuração
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Config Ativa - Destaque */}
      {configAtiva && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Power className="h-5 w-5 text-green-500" />
              Configuração Ativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Versão</p>
                <p className="text-2xl font-bold">v{configAtiva.versao}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{configAtiva.nome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modelo</p>
                <p className="font-medium">{configAtiva.model}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temperatura</p>
                <p className="font-medium">{configAtiva.temperatura}</p>
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleVisualizar(configAtiva.id)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Configurações</CardTitle>
          <CardDescription>
            Histórico completo de versões. Duplique uma config para criar nova versão baseada nela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Versão</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Temp.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Correções</TableHead>
                <TableHead>Média Nota</TableHead>
                <TableHead>Custo Total</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs?.map((config) => {
                const analise = getAnaliseConfig(config.id);
                return (
                  <TableRow key={config.id}>
                    <TableCell className="font-bold">v{config.versao}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{config.nome}</p>
                        {config.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {config.descricao}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {config.model}
                      </code>
                    </TableCell>
                    <TableCell>{config.temperatura}</TableCell>
                    <TableCell>
                      {config.ativo ? (
                        <Badge variant="default" className="bg-green-500">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inativa</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {analise?.total_correcoes ? (
                        <span className="font-medium">{analise.total_correcoes}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {analise?.media_nota ? (
                        <span className="font-medium">
                          {Number(analise.media_nota).toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {analise?.custo_total_usd ? (
                        <span className="font-medium">
                          ${Number(analise.custo_total_usd).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVisualizar(config.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!config.ativo && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAtivar(config.id)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicar(config.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {!analise?.total_correcoes && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(config.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: Criar Configuração */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Configuração de Correção</DialogTitle>
            <DialogDescription>
              Crie uma nova versão do sistema de correção. A configuração será criada como INATIVA.
            </DialogDescription>
          </DialogHeader>
          <JarvisCorrecaoConfigForm
            onSuccess={() => setShowCreateDialog(false)}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes */}
      {selectedConfigId && (
        <Dialog open={showDetalhesDialog} onOpenChange={setShowDetalhesDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Configuração</DialogTitle>
            </DialogHeader>
            <JarvisCorrecaoConfigDetalhes configId={selectedConfigId} />
          </DialogContent>
        </Dialog>
      )}

      {/* Alert: Ativar Config */}
      <AlertDialog open={!!configToActivate} onOpenChange={() => setConfigToActivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar Configuração?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá DESATIVAR a configuração atual e ATIVAR esta versão.
              Todas as próximas correções usarão esta configuração.
              <br />
              <br />
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAtivar}>
              Sim, Ativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert: Deletar Config */}
      <AlertDialog open={!!configToDelete} onOpenChange={() => setConfigToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Configuração?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é IRREVERSÍVEL. A configuração será permanentemente deletada.
              <br />
              <br />
              Apenas configurações inativas e sem correções associadas podem ser deletadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Sim, Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
