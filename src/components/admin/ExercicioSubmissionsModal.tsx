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
  nota_total: number | null;
  corrigida: boolean;
  status: string;
  aluno_id: string | null;
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

      console.log('🔍 [ExercicioSubmissionsModal] Exercício:', exercicioId);
      console.log('🔍 [ExercicioSubmissionsModal] Frase temática encontrada:', fraseTematica);

      if (!fraseTematica) {
        console.warn('⚠️ [ExercicioSubmissionsModal] Nenhuma frase temática encontrada para o exercício');
        setSubmissions([]);
        return;
      }

      // 2. Buscar redações que têm essa frase temática
      console.log('🔍 [ExercicioSubmissionsModal] Iniciando busca por redações...');
      console.log('🔍 [ExercicioSubmissionsModal] Query: frase_tematica =', fraseTematica);

      let redacoes: any = null;
      const { data: redacoesData, error: redacoesError } = await supabase
        .from("redacoes_enviadas")
        .select("email_aluno, nota_total, corrigida, status, aluno_id")
        .eq("frase_tematica", fraseTematica)
        .is("deleted_at", null);

      console.log('🔍 [ExercicioSubmissionsModal] Redações encontradas:', redacoesData?.length || 0);
      console.log('🔍 [ExercicioSubmissionsModal] Dados brutos de redações:', redacoesData);

      if (redacoesError) {
        console.error('❌ [ExercicioSubmissionsModal] Erro ao buscar redações:');
        console.error('   Código:', redacoesError.code);
        console.error('   Mensagem:', redacoesError.message);
        console.error('   Detalhes:', redacoesError.details);
        console.error('   Hint:', redacoesError.hint);
        console.error('   Objeto completo:', redacoesError);

        // Tentar uma query alternativa sem aluno_id
        console.log('🔄 [ExercicioSubmissionsModal] Tentando query alternativa sem aluno_id...');
        const { data: redacoesAlt, error: errorAlt } = await supabase
          .from("redacoes_enviadas")
          .select("email_aluno, nota_total, corrigida, status")
          .eq("frase_tematica", fraseTematica)
          .is("deleted_at", null);

        if (errorAlt) {
          console.error('❌ [ExercicioSubmissionsModal] Query alternativa também falhou:', errorAlt);
          throw redacoesError;
        }

        console.log('✅ [ExercicioSubmissionsModal] Query alternativa funcionou! Usando esses dados.');
        // Usar dados da query alternativa
        redacoes = redacoesAlt;
      } else {
        redacoes = redacoesData;
      }

      if (!redacoes || redacoes.length === 0) {
        console.log('⚠️ [ExercicioSubmissionsModal] Nenhuma redação encontrada');
        setSubmissions([]);
        return;
      }

      // 3. Buscar dados dos alunos separadamente
      // Normalizar emails (lowercase e trim) para garantir match
      const emails = redacoes
        .map(r => r.email_aluno?.toLowerCase().trim())
        .filter(Boolean);

      console.log('🔍 [ExercicioSubmissionsModal] Emails para buscar (normalizados):', emails);

      const { data: alunos, error: alunosError } = await supabase
        .from("profiles")
        .select("email, nome, turma")
        .in("email", emails);

      console.log('🔍 [ExercicioSubmissionsModal] === DIAGNÓSTICO COMPLETO ===');
      console.log('🔍 [ExercicioSubmissionsModal] Emails buscados (normalizados):', emails);
      console.log('🔍 [ExercicioSubmissionsModal] Total de alunos retornados:', alunos?.length || 0);
      console.log('🔍 [ExercicioSubmissionsModal] Alunos retornados (RAW):', JSON.stringify(alunos, null, 2));

      if (alunos && alunos.length > 0) {
        console.log('🔍 [ExercicioSubmissionsModal] PRIMEIRO ALUNO DETALHADO:');
        console.log('   - Email:', alunos[0].email);
        console.log('   - Nome:', alunos[0].nome);
        console.log('   - Turma:', alunos[0].turma);
        console.log('   - Tipo de turma:', typeof alunos[0].turma);
      }

      if (emails.length > 0 && (!alunos || alunos.length === 0)) {
        console.error('❌ [ExercicioSubmissionsModal] PROBLEMA: Buscamos emails mas não encontramos NENHUM aluno!');
        console.error('   Isso significa que os emails em redacoes_enviadas NÃO existem na tabela alunos');
      }

      if (alunosError) {
        console.error('❌ [ExercicioSubmissionsModal] Erro ao buscar alunos:', alunosError);
      }

      // 4. Criar mapa de email => dados do aluno (normalizar email para garantir match)
      const alunosMap = new Map(
        (alunos || []).map(a => [
          a.email.toLowerCase().trim(),
          { nome: a.nome, turma: a.turma }
        ])
      );

      console.log('🔍 [ExercicioSubmissionsModal] Map criado com', alunosMap.size, 'entradas');
      console.log('🔍 [ExercicioSubmissionsModal] Chaves do Map:', Array.from(alunosMap.keys()));

      // 5. Mapear os dados para o formato esperado
      const mappedData: SubmissionData[] = redacoes.map((item: any, index: number) => {
        // Normalizar email para buscar no Map
        const emailNormalizado = item.email_aluno?.toLowerCase().trim();
        const alunoData = alunosMap.get(emailNormalizado);

        if (index === 0) {
          console.log('🔍 [ExercicioSubmissionsModal] === MAPEAMENTO PRIMEIRO ITEM ===');
          console.log('   Email original:', item.email_aluno);
          console.log('   Email normalizado:', emailNormalizado);
          console.log('   Aluno encontrado no Map?', alunoData ? 'SIM' : 'NÃO');
          if (alunoData) {
            console.log('   Nome:', alunoData.nome);
            console.log('   Turma:', alunoData.turma);
          } else {
            console.error('   ❌ PROBLEMA: Email não encontrado no Map!');
            console.error('   Verifique se o email está exatamente igual na tabela alunos');
          }
        }

        const resultado = {
          nome_aluno: alunoData?.nome || item.email_aluno || 'Aluno',
          email_aluno: item.email_aluno,
          turma: alunoData?.turma || null,
          nota_total: item.nota_total,
          corrigida: item.corrigida,
          status: item.status,
          aluno_id: item.aluno_id
        };

        if (index === 0) {
          console.log('   Resultado final:', resultado);
        }

        return resultado;
      });

      // Ordenar por nota (maior nota primeiro), devolvidas e não corrigidas por último
      const sortedData = mappedData.sort((a, b) => {
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
