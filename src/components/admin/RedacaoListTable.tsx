
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Eye, RotateCcw, Download } from "lucide-react";
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
    <TooltipProvider>
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">Aluno</TableHead>
              <TableHead className="w-[8%]">Turma</TableHead>
              <TableHead className="w-[30%]">Tema</TableHead>
              <TableHead className="w-[8%]">Data</TableHead>
              <TableHead className="w-[18%]">Corretor</TableHead>
              <TableHead className="w-[8%]">Status</TableHead>
              <TableHead className="w-[8%] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redacoes.map((redacao) => (
              <TableRow key={redacao.id}>
                <TableCell className="w-[20%]">
                  <div className="font-medium text-sm leading-tight">{redacao.nome_aluno}</div>
                </TableCell>
                <TableCell className="w-[8%]">
                  <Badge className={`${getTurmaColor(redacao.turma)} text-xs px-1 py-0.5`}>
                    {redacao.turma}
                  </Badge>
                </TableCell>
                <TableCell className="w-[30%]">
                  <div className="text-sm truncate" title={redacao.frase_tematica}>
                    {truncateTheme(redacao.frase_tematica)}
                  </div>
                </TableCell>
                <TableCell className="w-[8%]">
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
                <TableCell className="w-[8%]">
                  <Badge className={`${getStatusColor(redacao.status, redacao.corrigida)} text-xs px-1 py-0.5`}>
                    {redacao.corrigida ? "Corrigida" : "Aguardando"}
                  </Badge>
                </TableCell>
                <TableCell className="w-[8%]">
                  <div className="flex gap-1 justify-center flex-wrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(redacao)}
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Visualizar</p>
                      </TooltipContent>
                    </Tooltip>

                    {redacao.corrigida && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadRedacaoCorrigida(redacao)}
                            className="h-6 w-6 p-0"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download PDF</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotateCorretor(redacao)}
                          className="h-6 w-6 p-0"
                          disabled={redacao.corrigida}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mudar corretor</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="h-6 w-6 p-0">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Excluir</p>
                        </TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza de que deseja excluir esta redação de <strong>{redacao.nome_aluno}</strong>?
                            <br />
                            <br />
                            <strong>Esta ação não poderá ser desfeita.</strong>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(redacao)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
      </div>
    </TooltipProvider>
  );
};
