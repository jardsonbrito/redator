
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Eye, RotateCcw, Download, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { downloadRedacaoCorrigida } from "@/utils/redacaoDownload";
import { RedacaoEnviada } from "@/hooks/useRedacoesEnviadas";
import { getStatusColor, getTurmaColor } from "@/utils/redacaoUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Corretor {
  id: string;
  nome_completo: string;
  email: string;
  ativo: boolean;
}

interface RedacaoListTableProps {
  redacoes: RedacaoEnviada[];
  onView: (redacao: RedacaoEnviada) => void;
  onDelete: (redacao: RedacaoEnviada) => void;
  onRefresh?: () => void;
}

export const RedacaoListTable = ({ redacoes, onView, onDelete, onRefresh }: RedacaoListTableProps) => {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [showCorretorDialog, setShowCorretorDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRedacao, setSelectedRedacao] = useState<RedacaoEnviada | null>(null);
  const [selectedCorretor, setSelectedCorretor] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCorretores();
  }, []);

  const fetchCorretores = async () => {
    try {
      const { data, error } = await supabase
        .from("corretores")
        .select("*")
        .eq("ativo", true)
        .order("nome_completo");

      if (error) throw error;
      setCorretores(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar corretores:", error);
    }
  };

  const truncateTheme = (theme: string) => {
    const words = theme.split(' ');
    if (words.length <= 4) return theme;
    return words.slice(0, 4).join(' ') + '...';
  };

  const handleRotateCorretor = (redacao: RedacaoEnviada) => {
    setSelectedRedacao(redacao);
    setSelectedCorretor("");
    setShowCorretorDialog(true);
  };

  const handleDeleteClick = (redacao: RedacaoEnviada) => {
    setSelectedRedacao(redacao);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (selectedRedacao) {
      onDelete(selectedRedacao);
      setShowDeleteDialog(false);
      setSelectedRedacao(null);
    }
  };

  const handleConfirmRotateCorretor = async () => {
    if (!selectedRedacao || !selectedCorretor) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("redacoes_enviadas")
        .update({
          corretor_id_1: selectedCorretor,
          corretor_id_2: null,
          status_corretor_1: 'pendente',
          status_corretor_2: null
        })
        .eq("id", selectedRedacao.id);

      if (error) throw error;

      toast({
        title: "Corretor alterado",
        description: "O corretor foi alterado com sucesso.",
      });

      setShowCorretorDialog(false);
      onRefresh?.();
    } catch (error: any) {
      console.error("Erro ao alterar corretor:", error);
      toast({
        title: "Erro ao alterar corretor",
        description: "Não foi possível alterar o corretor.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Aluno</TableHead>
              <TableHead className="w-[12%]">Data de Envio</TableHead>
              <TableHead className="w-[18%]">Corretor</TableHead>
              <TableHead className="w-[12%]">Status</TableHead>
              <TableHead className="w-[8%] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redacoes.map((redacao, index) => (
              <TableRow key={redacao.id}>
                <TableCell className="w-[30%]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono min-w-[20px]">{index + 1}</span>
                      <span className="font-medium text-sm">{redacao.nome_aluno}</span>
                      <span className="text-xs text-muted-foreground">—</span>
                      <Badge className={`${getTurmaColor(redacao.turma)} text-xs px-1 py-0.5`}>
                        {redacao.turma}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground ml-6" title={redacao.frase_tematica}>
                      {truncateTheme(redacao.frase_tematica)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="w-[12%]">
                  <div className="text-sm">
                    {new Date(redacao.data_envio).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit'
                    })}
                  </div>
                </TableCell>
                <TableCell className="w-[18%]">
                  <div className="text-xs space-y-0.5">
                    {redacao.corretor_1 && (
                      <div className="truncate" title={redacao.corretor_1.nome_completo}>
                        {redacao.corretor_1.nome_completo.length > 15
                          ? redacao.corretor_1.nome_completo.substring(0, 15) + '...'
                          : redacao.corretor_1.nome_completo}
                      </div>
                    )}
                    {redacao.corretor_2 && (
                      <div className="truncate" title={redacao.corretor_2.nome_completo}>
                        {redacao.corretor_2.nome_completo.length > 15
                          ? redacao.corretor_2.nome_completo.substring(0, 15) + '...'
                          : redacao.corretor_2.nome_completo}
                      </div>
                    )}
                    {!redacao.corretor_id_1 && !redacao.corretor_id_2 && (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-[12%]">
                  <Badge className={`${getStatusColor(redacao.status, redacao.corrigida)} text-xs px-1 py-0.5`}>
                    {redacao.status === 'devolvida' ? "Devolvida" :
                     redacao.status_corretor_1 === 'incompleta' || redacao.status_corretor_2 === 'incompleta' ? "Incompleta" :
                     redacao.corrigida ? "Corrigida" : "Aguardando"}
                  </Badge>
                </TableCell>
                <TableCell className="w-[8%]">
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(redacao)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        {redacao.corrigida && (
                          <DropdownMenuItem onClick={() => downloadRedacaoCorrigida(redacao)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleRotateCorretor(redacao)}
                          disabled={redacao.corrigida}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Mudar corretor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(redacao)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Corrector Rotation Dialog */}
        <Dialog open={showCorretorDialog} onOpenChange={setShowCorretorDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mudar Corretor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione um novo corretor para a redação de <strong>{selectedRedacao?.nome_aluno}</strong>:
              </p>
              <Select value={selectedCorretor} onValueChange={setSelectedCorretor}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um corretor" />
                </SelectTrigger>
                <SelectContent>
                  {corretores.map((corretor) => (
                    <SelectItem key={corretor.id} value={corretor.id}>
                      {corretor.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCorretorDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmRotateCorretor}
                  disabled={!selectedCorretor || loading}
                >
                  {loading ? "Alterando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza de que deseja excluir esta redação de <strong>{selectedRedacao?.nome_aluno}</strong>?
                <br />
                <br />
                <strong>Esta ação não poderá ser desfeita.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
};
