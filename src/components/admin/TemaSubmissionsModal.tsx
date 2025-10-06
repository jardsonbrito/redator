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
import { formatTurmaDisplay } from "@/utils/turmaUtils";

interface SubmissionData {
  nome_aluno: string;
  email_aluno: string;
  turma: string | null;
  nota_total: number | null;
  corrigida: boolean;
  status: string;
  nota_corretor_1?: number | null;
  nota_corretor_2?: number | null;
  is_simulado?: boolean;
}

interface TemaSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fraseTematica: string;
  temaId: string;
}

export const TemaSubmissionsModal = ({
  isOpen,
  onClose,
  fraseTematica,
  temaId,
}: TemaSubmissionsModalProps) => {
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulado, setIsSimulado] = useState(false);

  useEffect(() => {
    if (isOpen && fraseTematica) {
      fetchSubmissions();
    }
  }, [isOpen, fraseTematica]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);

      // Verificar se existe um simulado com essa frase temática
      const { data: simulado, error: simuladoError } = await supabase
        .from("simulados")
        .select("id")
        .eq("frase_tematica", fraseTematica)
        .maybeSingle();

      let data: SubmissionData[] = [];
      let error = null;

      if (simulado && simulado.id) {
        // É um simulado - buscar de redacoes_simulado
        setIsSimulado(true);
        const { data: redacoesSimulado, error: redacoesError } = await supabase
          .from("redacoes_simulado")
          .select("nome_aluno, email_aluno, turma, nota_final_corretor_1, nota_final_corretor_2, corrigida")
          .eq("id_simulado", simulado.id);

        if (redacoesError) {
          error = redacoesError;
        } else {
          // Buscar nomes reais dos profiles
          const emails = (redacoesSimulado || []).map(r => r.email_aluno).filter(Boolean);

          const { data: profiles } = await supabase
            .from("profiles")
            .select("email, nome")
            .in("email", emails);

          const profileMap = new Map(
            (profiles || []).map(p => [p.email, p.nome])
          );

          // Calcular média das duas notas para cada redação
          data = (redacoesSimulado || []).map(r => {
            const nota1 = r.nota_final_corretor_1 ?? null;
            const nota2 = r.nota_final_corretor_2 ?? null;

            let notaFinal = null;
            let corrigida = r.corrigida || false;

            // Se ambas as notas existem, calcular média
            if (nota1 !== null && nota2 !== null) {
              notaFinal = Math.round((nota1 + nota2) / 2);
              corrigida = true;
            }

            // Usar nome do profile se disponível, senão usar nome_aluno da redação
            const nomeReal = profileMap.get(r.email_aluno) || r.nome_aluno;

            return {
              nome_aluno: nomeReal,
              email_aluno: r.email_aluno,
              turma: r.turma || null,
              nota_total: notaFinal,
              nota_corretor_1: nota1,
              nota_corretor_2: nota2,
              corrigida: corrigida,
              status: corrigida ? 'corrigida' : 'aguardando',
              is_simulado: true
            };
          });
        }
      } else {
        // É um tema regular - buscar de redacoes_enviadas
        setIsSimulado(false);
        const { data: redacoesRegulares, error: redacoesError } = await supabase
          .from("redacoes_enviadas")
          .select("nome_aluno, email_aluno, turma, nota_total, corrigida, status")
          .eq("frase_tematica", fraseTematica);

        if (redacoesError) {
          error = redacoesError;
        } else {
          // Buscar nomes reais dos profiles
          const emails = (redacoesRegulares || []).map(r => r.email_aluno).filter(Boolean);

          const { data: profiles } = await supabase
            .from("profiles")
            .select("email, nome")
            .in("email", emails);

          const profileMap = new Map(
            (profiles || []).map(p => [p.email, p.nome])
          );

          // Mapear para usar nome do profile
          data = (redacoesRegulares || []).map(r => {
            const nomeReal = profileMap.get(r.email_aluno) || r.nome_aluno;

            return {
              nome_aluno: nomeReal,
              email_aluno: r.email_aluno,
              turma: r.turma || null,
              nota_total: r.nota_total,
              corrigida: r.corrigida,
              status: r.status
            };
          });
        }
      }

      if (error) throw error;

      // Ordenar por nota (maior nota primeiro), devolvidas e não corrigidas por último
      const sortedData = (data || []).sort((a, b) => {
        // Redações devolvidas vão para o final
        const aDevolvida = a.status === 'devolvida';
        const bDevolvida = b.status === 'devolvida';

        if (aDevolvida && !bDevolvida) return 1;
        if (!aDevolvida && bDevolvida) return -1;

        // Se ambas devolvidas, ordenar por nome
        if (aDevolvida && bDevolvida) {
          return a.nome_aluno.localeCompare(b.nome_aluno);
        }

        // Se ambas não foram corrigidas (aguardando/em_correcao), ordenar por nome
        if (!a.corrigida && !b.corrigida) {
          return a.nome_aluno.localeCompare(b.nome_aluno);
        }

        // Redações não corrigidas vão depois das corrigidas
        if (!a.corrigida) return 1;
        if (!b.corrigida) return -1;

        // Se ambas foram corrigidas, ordenar pela maior nota primeiro (ranking)
        const notaA = a.nota_total ?? 0;
        const notaB = b.nota_total ?? 0;

        if (notaB !== notaA) {
          return notaB - notaA; // Maior nota primeiro
        }

        // Se notas iguais, ordenar por nome
        return a.nome_aluno.localeCompare(b.nome_aluno);
      });

      setSubmissions(sortedData);
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
            Tema: {fraseTematica}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum aluno enviou redação para este tema ainda.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-16 text-center font-semibold">#</TableHead>
                  <TableHead className="font-semibold">Nome do Aluno</TableHead>
                  <TableHead className="font-semibold">Turma</TableHead>
                  {isSimulado ? (
                    <>
                      <TableHead className="font-semibold text-center">Nota C1</TableHead>
                      <TableHead className="font-semibold text-center">Nota C2</TableHead>
                      <TableHead className="font-semibold text-center">Média</TableHead>
                    </>
                  ) : (
                    <TableHead className="font-semibold text-center">Nota</TableHead>
                  )}
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
                      {submission.turma && submission.turma !== "null" ? formatTurmaDisplay(submission.turma) : "—"}
                    </TableCell>
                    {isSimulado ? (
                      <>
                        <TableCell className="text-center">
                          {submission.nota_corretor_1 !== null && submission.nota_corretor_1 !== undefined ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {submission.nota_corretor_1}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {submission.nota_corretor_2 !== null && submission.nota_corretor_2 !== undefined ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {submission.nota_corretor_2}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {submission.status === 'devolvida' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-orange-100 text-orange-700">
                              Devolvida
                            </span>
                          ) : submission.corrigida ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                              {submission.nota_total !== null ? submission.nota_total : "—"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                              Aguardando
                            </span>
                          )}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell className="text-center">
                        {submission.status === 'devolvida' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-orange-100 text-orange-700">
                            Devolvida
                          </span>
                        ) : submission.corrigida ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                            {submission.nota_total !== null ? submission.nota_total : "—"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                            Aguardando
                          </span>
                        )}
                      </TableCell>
                    )}
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
