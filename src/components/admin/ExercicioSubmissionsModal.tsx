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
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Edit } from "lucide-react";
import { AdminCorrecaoProducaoGuiadaModal } from "./AdminCorrecaoProducaoGuiadaModal";

interface SubmissionData {
  id: string;
  nome_aluno: string;
  email_aluno: string;
  turma: string | null;
  nota_total: number | null;
  corrigida: boolean;
  status: string;
  aluno_id: string | null;
  redacao_texto: string | null;
  data_envio: string | null;
  ciente?: boolean;
}

interface ExercicioSubmissionsModalProps {
  isOpen: boolean;
  exercicioTipo?: string;
  onClose: () => void;
  exercicioId: string;
  exercicioTitulo: string;
}

export const ExercicioSubmissionsModal = ({
  isOpen,
  onClose,
  exercicioId,
  exercicioTitulo,
  exercicioTipo,
}: ExercicioSubmissionsModalProps) => {
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submissaoParaCorrigir, setSubmissaoParaCorrigir] = useState<SubmissionData | null>(null);
  const [correcaoAberta, setCorrecaoAberta] = useState(false);

  useEffect(() => {
    if (isOpen && exercicioId) {
      fetchSubmissions();
    }
  }, [isOpen, exercicioId]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);

      // Produção Guiada: buscar direto em redacoes_exercicio por exercicio_id
      if (exercicioTipo === 'Produção Guiada') {
        const { data: respostas, error } = await supabase
          .from("redacoes_exercicio")
          .select("id, nome_aluno, email_aluno, turma, nota_total, corrigida, status_corretor_1, redacao_texto, data_envio")
          .eq("exercicio_id", exercicioId);

        if (error) throw error;

        const mappedData: SubmissionData[] = (respostas || []).map(r => ({
          id: r.id,
          nome_aluno: r.nome_aluno,
          email_aluno: r.email_aluno,
          turma: r.turma,
          nota_total: r.nota_total,
          corrigida: r.corrigida ?? false,
          status: r.status_corretor_1 ?? "pendente",
          aluno_id: null,
          redacao_texto: r.redacao_texto,
          data_envio: r.data_envio,
          ciente: false,
        }));

        // Verificar ciência para submissões devolvidas
        const devolvidas = mappedData.filter(m => m.status === "devolvida");
        if (devolvidas.length > 0) {
          const { data: visualizacoes } = await supabase
            .from("redacao_devolucao_visualizacoes")
            .select("redacao_id, email_aluno")
            .in("redacao_id", devolvidas.map(d => d.id));

          if (visualizacoes) {
            const cienteSet = new Set(visualizacoes.map(v => v.redacao_id));
            mappedData.forEach(m => { if (cienteSet.has(m.id)) m.ciente = true; });
          }
        }

        const getPrioridadePG = (s: SubmissionData) => {
          if (s.status === 'reenviado') return 0;
          if (!s.corrigida && s.status !== 'devolvida') return 1;
          if (s.status === 'devolvida') return 2;
          return 3; // corrigida
        };
        mappedData.sort((a, b) => {
          const pa = getPrioridadePG(a);
          const pb = getPrioridadePG(b);
          if (pa !== pb) return pa - pb;
          if (a.corrigida && b.corrigida) return (b.nota_total ?? 0) - (a.nota_total ?? 0);
          return a.nome_aluno.localeCompare(b.nome_aluno);
        });

        setSubmissions(mappedData);
        return;
      }

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
      let redacoes: any = null;
      const { data: redacoesData, error: redacoesError } = await supabase
        .from("redacoes_enviadas")
        .select("email_aluno, nota_total, corrigida, status, aluno_id")
        .eq("frase_tematica", fraseTematica)
        .is("deleted_at", null);

      if (redacoesError) {
        const { data: redacoesAlt, error: errorAlt } = await supabase
          .from("redacoes_enviadas")
          .select("email_aluno, nota_total, corrigida, status")
          .eq("frase_tematica", fraseTematica)
          .is("deleted_at", null);

        if (errorAlt) throw redacoesError;
        redacoes = redacoesAlt;
      } else {
        redacoes = redacoesData;
      }

      if (!redacoes || redacoes.length === 0) {
        setSubmissions([]);
        return;
      }

      // 3. Buscar dados dos alunos
      const emails = redacoes
        .map(r => r.email_aluno?.toLowerCase().trim())
        .filter(Boolean);

      const { data: alunos } = await supabase
        .from("profiles")
        .select("email, nome, turma")
        .in("email", emails);

      const alunosMap = new Map(
        (alunos || []).map(a => [
          a.email.toLowerCase().trim(),
          { nome: a.nome, turma: a.turma }
        ])
      );

      const mappedData: SubmissionData[] = redacoes.map((item: any) => {
        const emailNormalizado = item.email_aluno?.toLowerCase().trim();
        const alunoData = alunosMap.get(emailNormalizado);

        return {
          id: item.id ?? "",
          nome_aluno: alunoData?.nome || item.email_aluno || 'Aluno',
          email_aluno: item.email_aluno,
          turma: alunoData?.turma || null,
          nota_total: item.nota_total,
          corrigida: item.corrigida,
          status: item.status,
          aluno_id: item.aluno_id,
          redacao_texto: null,
          data_envio: null,
        };
      });

      const sortedData = mappedData.sort((a, b) => {
        const aDevolvida = a.status === 'devolvida';
        const bDevolvida = b.status === 'devolvida';

        if (aDevolvida && !bDevolvida) return 1;
        if (!aDevolvida && bDevolvida) return -1;
        if (aDevolvida && bDevolvida) return a.nome_aluno.localeCompare(b.nome_aluno);
        if (!a.corrigida && !b.corrigida) return a.nome_aluno.localeCompare(b.nome_aluno);
        if (!a.corrigida) return 1;
        if (!b.corrigida) return -1;

        const notaA = a.nota_total ?? 0;
        const notaB = b.nota_total ?? 0;
        if (notaB !== notaA) return notaB - notaA;
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

  const handleAbrirCorrecao = (submission: SubmissionData) => {
    setSubmissaoParaCorrigir(submission);
    setTimeout(() => setCorrecaoAberta(true), 100);
  };

  const handleCorrecaoSucesso = () => {
    setCorrecaoAberta(false);
    setSubmissaoParaCorrigir(null);
    fetchSubmissions();
  };

  const isProducaoGuiada = exercicioTipo === 'Produção Guiada';

  return (
    <>
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
                    <TableHead className="font-semibold text-center">Nota</TableHead>
                    {isProducaoGuiada && (
                      <TableHead className="font-semibold text-center w-28">Ação</TableHead>
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
                        {submission.turma || "Sem turma"}
                      </TableCell>
                      <TableCell className="text-center">
                        {submission.status === 'reenviado' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            Aguardando 2ª correção
                          </span>
                        ) : submission.status === 'devolvida' ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${submission.ciente ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {submission.ciente ? 'Devolvida — Ciente' : 'Devolvida'}
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
                      {isProducaoGuiada && (
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAbrirCorrecao(submission)}
                            className="text-xs h-7 px-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            {submission.corrigida ? "Ver/Editar" : submission.status === 'devolvida' ? "Devolver/Editar" : "Corrigir"}
                          </Button>
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

      {/* Modal de correção (Produção Guiada) */}
      <AdminCorrecaoProducaoGuiadaModal
        isOpen={correcaoAberta}
        onClose={() => {
          setCorrecaoAberta(false);
          setSubmissaoParaCorrigir(null);
        }}
        submissao={submissaoParaCorrigir}
        exercicioId={exercicioId}
        exercicioTitulo={exercicioTitulo}
        onSucesso={handleCorrecaoSucesso}
      />
    </>
  );
};
