import { useState, useMemo } from "react";
import { useJarvisCorrecao, JarvisCorrecao } from "@/hooks/useJarvisCorrecao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, Eye, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DetalhesCorrecao } from "./DetalhesCorrecao";

interface Props {
  professorEmail: string;
}

export const HistoricoCorrecoes = ({ professorEmail }: Props) => {
  const { correcoes, turmas, isLoading } = useJarvisCorrecao(professorEmail);

  const [filtroAluno, setFiltroAluno] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [correcaoSelecionada, setCorrecaoSelecionada] = useState<JarvisCorrecao | null>(null);

  const correcoesFiltradas = useMemo(() => {
    if (!correcoes) return [];

    return correcoes.filter((correcao) => {
      // Filtro por aluno
      if (
        filtroAluno &&
        !correcao.autor_nome.toLowerCase().includes(filtroAluno.toLowerCase())
      ) {
        return false;
      }

      // Filtro por turma
      if (filtroTurma !== "all" && correcao.turma_id !== filtroTurma) {
        return false;
      }

      // Filtro por status
      if (filtroStatus !== "all" && correcao.status !== filtroStatus) {
        return false;
      }

      return true;
    });
  }, [correcoes, filtroAluno, filtroTurma, filtroStatus]);

  const handleVisualizar = (correcao: JarvisCorrecao) => {
    setCorrecaoSelecionada(correcao);
    setShowDetalhes(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "corrigida":
        return <Badge variant="default" className="bg-green-500">Corrigida</Badge>;
      case "revisao_ocr":
        return <Badge variant="default" className="bg-orange-500">Aguardando Revisão</Badge>;
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
          <CardDescription>
            Todas as redações enviadas para correção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por aluno..."
                  value={filtroAluno}
                  onChange={(e) => setFiltroAluno(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
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
            </div>

            <div>
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
          </div>

          {/* Resumo dos filtros */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>
              Mostrando {correcoesFiltradas.length} de {correcoes?.length || 0} correções
            </span>
          </div>

          {/* Tabela */}
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
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {correcoesFiltradas.map((correcao) => {
                  const turma = turmas?.find((t: any) => t.id === correcao.turma_id);
                  return (
                    <TableRow key={correcao.id}>
                      <TableCell className="text-sm">
                        {format(new Date(correcao.criado_em), "dd/MM/yy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {correcao.autor_nome}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {correcao.tema}
                      </TableCell>
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
                          <span className="font-bold text-lg">
                            {correcao.nota_total}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVisualizar(correcao)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
              <DialogTitle>Detalhes da Correção</DialogTitle>
            </DialogHeader>
            <DetalhesCorrecao correcao={correcaoSelecionada} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
