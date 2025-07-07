
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Eye } from "lucide-react";
import { RedacaoEnviada } from "@/hooks/useRedacoesEnviadas";
import { getStatusColor, getTurmaColor } from "@/utils/redacaoUtils";

interface RedacaoListTableProps {
  redacoes: RedacaoEnviada[];
  onView: (redacao: RedacaoEnviada) => void;
  onDelete: (redacao: RedacaoEnviada) => void;
}

export const RedacaoListTable = ({ redacoes, onView, onDelete }: RedacaoListTableProps) => {
  return (
    <TooltipProvider>
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[25%]">Aluno</TableHead>
              <TableHead className="w-[10%]">Turma</TableHead>
              <TableHead className="w-[25%]">Tema</TableHead>
              <TableHead className="w-[10%]">Data</TableHead>
              <TableHead className="w-[15%]">Corretor</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[5%] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redacoes.map((redacao) => (
              <TableRow key={redacao.id}>
                <TableCell className="w-[25%]">
                  <div>
                    <div className="font-medium text-sm leading-tight">{redacao.nome_aluno}</div>
                    <div className="text-xs text-gray-500 truncate">{redacao.email_aluno}</div>
                  </div>
                </TableCell>
                <TableCell className="w-[10%]">
                  <Badge className={`${getTurmaColor(redacao.turma)} text-xs px-1 py-0.5`}>
                    {redacao.turma}
                  </Badge>
                </TableCell>
                <TableCell className="w-[25%]">
                  <div className="text-sm truncate" title={redacao.frase_tematica}>
                    {redacao.frase_tematica}
                  </div>
                </TableCell>
                <TableCell className="w-[10%]">
                  <div className="text-sm">
                    {new Date(redacao.data_envio).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit'
                    })}
                  </div>
                </TableCell>
                <TableCell className="w-[15%]">
                  <div className="text-xs space-y-0.5">
                    {redacao.corretor_1 && (
                      <div className="truncate" title={redacao.corretor_1.nome_completo}>
                        {redacao.corretor_1.nome_completo}
                      </div>
                    )}
                    {redacao.corretor_2 && (
                      <div className="truncate" title={redacao.corretor_2.nome_completo}>
                        {redacao.corretor_2.nome_completo}
                      </div>
                    )}
                    {!redacao.corretor_id_1 && !redacao.corretor_id_2 && (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-[10%]">
                  <Badge className={`${getStatusColor(redacao.status, redacao.corrigida)} text-xs px-1 py-0.5`}>
                    {redacao.corrigida ? "Corrigida" : "Aguardando"}
                  </Badge>
                </TableCell>
                <TableCell className="w-[5%]">
                  <div className="flex gap-1 justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(redacao)}
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Visualizar</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="h-7 w-7 p-0">
                              <Trash2 className="w-3.5 h-3.5" />
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
      </div>
    </TooltipProvider>
  );
};
