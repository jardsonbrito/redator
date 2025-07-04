
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Copy } from "lucide-react";
import { RedacaoEnviada } from "@/hooks/useRedacoesEnviadas";
import { getStatusColor, getTurmaColor } from "@/utils/redacaoUtils";

interface RedacaoListTableProps {
  redacoes: RedacaoEnviada[];
  onCorrection: (redacao: RedacaoEnviada) => void;
  onDelete: (redacao: RedacaoEnviada) => void;
  onCopy: (redacao: RedacaoEnviada) => void;
}

export const RedacaoListTable = ({ redacoes, onCorrection, onDelete, onCopy }: RedacaoListTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aluno</TableHead>
            <TableHead>Turma</TableHead>
            <TableHead>Tema</TableHead>
            <TableHead>Data Envio</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {redacoes.map((redacao) => (
            <TableRow key={redacao.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{redacao.nome_aluno}</div>
                  <div className="text-sm text-gray-500">{redacao.email_aluno}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getTurmaColor(redacao.turma)}>
                  {redacao.turma}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="truncate" title={redacao.frase_tematica}>
                  {redacao.frase_tematica}
                </div>
              </TableCell>
              <TableCell>
                {new Date(redacao.data_envio).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(redacao.status, redacao.corrigida)}>
                  {redacao.corrigida ? "Corrigida" : "Aguardando"}
                </Badge>
              </TableCell>
              <TableCell>
                {redacao.nota_total ? `${redacao.nota_total}/1000` : "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCopy(redacao)}
                    title="Copiar redação com dados do aluno"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCorrection(redacao)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    {redacao.corrigida ? "Editar" : "Corrigir"}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
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
  );
};
