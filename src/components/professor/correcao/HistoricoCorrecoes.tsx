import { useState, useMemo } from "react";
import { useJarvisCorrecao, JarvisCorrecao } from "@/hooks/useJarvisCorrecao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, Search, Eye, Filter, Trash2, UserX, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DetalhesCorrecao } from "./DetalhesCorrecao";

interface Props {
  professorEmail: string;
}

type DialogState =
  | { tipo: "individual"; correcao: JarvisCorrecao }
  | { tipo: "aluno"; autorNome: string }
  | null;

export const HistoricoCorrecoes = ({ professorEmail }: Props) => {
  const { correcoes, turmas, isLoading, deletarCorrecao, deletarPorAluno } =
    useJarvisCorrecao(professorEmail);

  const [filtroAluno, setFiltroAluno] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [correcaoSelecionada, setCorrecaoSelecionada] = useState<JarvisCorrecao | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const correcoesFiltradas = useMemo(() => {
    if (!correcoes) return [];
    return correcoes.filter((c) => {
      if (filtroAluno && !c.autor_nome.toLowerCase().includes(filtroAluno.toLowerCase()))
        return false;
      if (filtroTurma !== "all" && c.turma_id !== filtroTurma) return false;
      if (filtroStatus !== "all" && c.status !== filtroStatus) return false;
      return true;
    });
  }, [correcoes, filtroAluno, filtroTurma, filtroStatus]);

  const handleVisualizar = (correcao: JarvisCorrecao) => {
    setCorrecaoSelecionada(correcao);
    setShowDetalhes(true);
  };

  const confirmarDelecao = async () => {
    if (!dialog) return;
    if (dialog.tipo === "individual") {
      await deletarCorrecao.mutateAsync(dialog.correcao.id);
    } else {
      await deletarPorAluno.mutateAsync(dialog.autorNome);
    }
    setDialog(null);
  };

  const isPending = deletarCorrecao.isPending || deletarPorAluno.isPending;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "corrigida":
        return <Badge className="bg-green-500">Corrigida</Badge>;
      case "revisao_ocr":
        return <Badge className="bg-orange-500">Aguardando Revisão</Badge>;
      case "aguardando_correcao":
        return <Badge variant="outline">Aguardando Correção</Badge>;
      case "erro":
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Correções</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por aluno..."
                value={filtroAluno}
                onChange={(e) => setFiltroAluno(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filtroTurma} onValueChange={setFiltroTurma}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as turmas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {turmas?.map((turma: any) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="corrigida">Corrigida</SelectItem>
                <SelectItem value="revisao_ocr">Aguardando Revisão</SelectItem>
                <SelectItem value="aguardando_correcao">Aguardando Correção</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>
              Mostrando {correcoesFiltradas.length} de {correcoes?.length || 0} correções
            </span>
          </div>

          {correcoesFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {correcoes?.length === 0
                  ? "Nenhuma correção enviada ainda"
                  : "Nenhuma correção encontrada com os filtros aplicados"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Tema</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {correcoesFiltradas.map((correcao) => {
                  const turma = turmas?.find((t: any) => t.id === correcao.turma_id);
                  return (
                    <TableRow key={correcao.id}>
                      <TableCell className="text-sm">
                        {format(new Date(correcao.criado_em), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{correcao.autor_nome}</TableCell>
                      <TableCell className="max-w-xs truncate">{correcao.tema}</TableCell>
                      <TableCell>
                        {turma ? (
                          <span className="text-sm">{turma.nome}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(correcao.status)}</TableCell>
                      <TableCell>
                        {correcao.nota_total !== null ? (
                          <span className="font-bold text-lg">{correcao.nota_total}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu
                          open={openDropdownId === correcao.id}
                          onOpenChange={(open) =>
                            setOpenDropdownId(open ? correcao.id : null)
                          }
                        >
                          <DropdownMenuTrigger asChild>
                            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            onCloseAutoFocus={(e) => e.preventDefault()}
                          >
                            <DropdownMenuItem
                              onClick={() => {
                                setOpenDropdownId(null);
                                handleVisualizar(correcao);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setOpenDropdownId(null);
                                setTimeout(
                                  () => setDialog({ tipo: "individual", correcao }),
                                  100
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover esta correção
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setOpenDropdownId(null);
                                setTimeout(
                                  () =>
                                    setDialog({
                                      tipo: "aluno",
                                      autorNome: correcao.autor_nome,
                                    }),
                                  100
                                );
                              }}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Remover todas de {correcao.autor_nome}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Detalhes da Correção */}
      {correcaoSelecionada && (
        <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Correção pedagógica detalhada</DialogTitle>
            </DialogHeader>
            <DetalhesCorrecao
              correcao={correcaoSelecionada}
              professorEmail={professorEmail}
              onReprocessado={() => setShowDetalhes(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* AlertDialog: Confirmação de deleção */}
      <AlertDialog open={!!dialog} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog?.tipo === "individual" && "Remover correção?"}
              {dialog?.tipo === "aluno" && `Remover todas as correções de ${dialog?.autorNome}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog?.tipo === "individual" && (
                <>
                  A correção de <strong>{dialog.correcao.autor_nome}</strong> —{" "}
                  <em>{dialog.correcao.tema}</em> será removida permanentemente.
                </>
              )}
              {dialog?.tipo === "aluno" && (
                <>
                  Todas as correções de <strong>{dialog.autorNome}</strong> serão
                  removidas permanentemente. Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDelecao}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
