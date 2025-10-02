import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SubmissionData {
  nome_aluno: string;
  email_aluno: string;
  turma: string | null;
}

interface ExercicioSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercicioId: string;
  exercicioTitulo: string;
}

export const ExercicioSubmissionsModal = ({
  isOpen,
  onClose,
  exercicioId,
  exercicioTitulo,
}: ExercicioSubmissionsModalProps) => {
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && exercicioId) {
      fetchSubmissions();
    }
  }, [isOpen, exercicioId]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);

      // 1. Buscar o exercício e pegar o tema vinculado
      const { data: exercicio, error: exercicioError } = await supabase
        .from("exercicios")
        .select("tema_id, temas(frase_tematica)")
        .eq("id", exercicioId)
        .single();

      if (exercicioError) throw exercicioError;

      const fraseTematica = exercicio?.temas?.frase_tematica;

      if (!fraseTematica) {
        setSubmissions([]);
        return;
      }

      // 2. Buscar redações que têm essa frase temática
      const { data, error } = await supabase
        .from("redacoes_enviadas")
        .select("nome_aluno, email_aluno, turma")
        .eq("frase_tematica", fraseTematica)
        .order("nome_aluno", { ascending: true });

      if (error) throw error;

      setSubmissions(data || []);
    } catch (error) {
      console.error("Erro ao buscar envios:", error);
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Alunos que Enviaram Redação
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Exercício: {exercicioTitulo}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum aluno enviou redação para este exercício ainda.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-16 text-center font-semibold">#</TableHead>
                  <TableHead className="font-semibold">Nome do Aluno</TableHead>
                  <TableHead className="font-semibold">Turma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="text-center text-gray-600 font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {submission.nome_aluno}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {submission.turma || "Sem turma"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && submissions.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-right">
            Total: {submissions.length} {submissions.length === 1 ? 'aluno' : 'alunos'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
