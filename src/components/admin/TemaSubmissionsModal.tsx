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

      console.log('🔍 [TemaSubmissionsModal] Buscando envios para tema:', fraseTematica);

      // Verificar se existe um simulado com essa frase temática
      const { data: simulado, error: simuladoError } = await supabase
        .from("simulados")
        .select("id")
        .eq("frase_tematica", fraseTematica)
        .maybeSingle();

      console.log('🔍 [TemaSubmissionsModal] Simulado encontrado:', simulado);

      let data: SubmissionData[] = [];
      let error = null;

      if (simulado && simulado.id) {
        // É um simulado - buscar de redacoes_simulado
        setIsSimulado(true);

        console.log('🔍 [TemaSubmissionsModal] Buscando redações do simulado:', simulado.id);

        // Buscar redações do simulado (sem JOIN que pode falhar)
        let redacoesSimulado: any = null;
        const { data: redacoesData, error: redacoesError } = await supabase
          .from("redacoes_simulado")
          .select("email_aluno, nota_final_corretor_1, nota_final_corretor_2, corrigida, aluno_id, turma")
          .eq("id_simulado", simulado.id);

        if (redacoesError) {
          console.error('❌ [TemaSubmissionsModal] Erro ao buscar redações do simulado:', redacoesError);
          error = redacoesError;
        } else {
          redacoesSimulado = redacoesData;
          console.log('🔍 [TemaSubmissionsModal] Redações do simulado encontradas:', redacoesSimulado?.length || 0);

          if (redacoesSimulado && redacoesSimulado.length > 0) {
            // Buscar dados dos alunos separadamente
            // Normalizar emails (lowercase e trim) para garantir match
            const emails = redacoesSimulado
              .map((r: any) => r.email_aluno?.toLowerCase().trim())
              .filter(Boolean);

            console.log('🔍 [TemaSubmissionsModal] Emails para buscar (normalizados):', emails);

            const { data: alunos, error: alunosError } = await supabase
              .from("alunos")
              .select("email, nome_completo, turma")
              .in("email", emails);

            console.log('🔍 [TemaSubmissionsModal] Alunos encontrados:', alunos?.length || 0);
            console.log('🔍 [TemaSubmissionsModal] Detalhes dos alunos:',
              alunos?.map(a => ({ email: a.email, nome: a.nome_completo, turma: a.turma }))
            );

            if (alunosError) {
              console.error('❌ [TemaSubmissionsModal] Erro ao buscar alunos:', alunosError);
            }

            // Criar mapa de email => dados do aluno (normalizar email para garantir match)
            const alunosMap = new Map(
              (alunos || []).map(a => [
                a.email.toLowerCase().trim(),
                { nome: a.nome_completo, turma: a.turma }
              ])
            );

            // Calcular média das duas notas para cada redação
            data = redacoesSimulado.map((r: any) => {
              const nota1 = r.nota_final_corretor_1 ?? null;
              const nota2 = r.nota_final_corretor_2 ?? null;

              let notaFinal = null;
              let corrigida = r.corrigida || false;

              // Se ambas as notas existem, calcular média
              if (nota1 !== null && nota2 !== null) {
                notaFinal = Math.round((nota1 + nota2) / 2);
                corrigida = true;
              }

              // Usar dados reais da tabela alunos
              // Normalizar email para buscar no Map
              const emailNormalizado = r.email_aluno?.toLowerCase().trim();
              const alunoData = alunosMap.get(emailNormalizado);
              const nomeReal = alunoData?.nome || r.email_aluno || 'Aluno';
              const turmaAtual = alunoData?.turma || r.turma || null;

              console.log('🔍 [TemaSubmissionsModal] Mapeando redação simulado:', {
                email_original: r.email_aluno,
                email_normalizado: emailNormalizado,
                aluno_data: alunoData,
                nome_completo: nomeReal,
                turma: turmaAtual
              });

              return {
                nome_aluno: nomeReal,
                email_aluno: r.email_aluno,
                turma: turmaAtual,
                nota_total: notaFinal,
                nota_corretor_1: nota1,
                nota_corretor_2: nota2,
                corrigida: corrigida,
                status: corrigida ? 'corrigida' : 'aguardando',
                is_simulado: true
              };
            });
          }
        }
      } else {
        // É um tema regular - buscar de redacoes_enviadas
        setIsSimulado(false);
        console.log('🔍 [TemaSubmissionsModal] Iniciando busca por redações regulares...');

        let redacoesRegulares: any = null;
        const { data: redacoesData, error: redacoesError } = await supabase
          .from("redacoes_enviadas")
          .select("email_aluno, nota_total, corrigida, status, aluno_id")
          .eq("frase_tematica", fraseTematica);

        if (redacoesError) {
          console.error('❌ [TemaSubmissionsModal] Erro ao buscar redações:');
          console.error('   Código:', redacoesError.code);
          console.error('   Mensagem:', redacoesError.message);

          // Tentar query alternativa sem aluno_id
          console.log('🔄 [TemaSubmissionsModal] Tentando query alternativa sem aluno_id...');
          const { data: redacoesAlt, error: errorAlt } = await supabase
            .from("redacoes_enviadas")
            .select("email_aluno, nota_total, corrigida, status")
            .eq("frase_tematica", fraseTematica);

          if (errorAlt) {
            console.error('❌ [TemaSubmissionsModal] Query alternativa também falhou:', errorAlt);
            error = redacoesError;
          } else {
            console.log('✅ [TemaSubmissionsModal] Query alternativa funcionou!');
            redacoesRegulares = redacoesAlt;
          }
        } else {
          redacoesRegulares = redacoesData;
        }

        if (!error && redacoesRegulares) {
          console.log('🔍 [TemaSubmissionsModal] Redações regulares encontradas:', redacoesRegulares?.length || 0);
          console.log('🔍 [TemaSubmissionsModal] Dados brutos de redações:', redacoesRegulares);

            if (redacoesRegulares && redacoesRegulares.length > 0) {
              // Buscar dados dos alunos separadamente
              // Normalizar emails (lowercase e trim) para garantir match
              const emails = redacoesRegulares
                .map((r: any) => r.email_aluno?.toLowerCase().trim())
                .filter(Boolean);

              console.log('🔍 [TemaSubmissionsModal] Emails para buscar (normalizados):', emails);

              const { data: alunos, error: alunosError } = await supabase
                .from("alunos")
                .select("email, nome_completo, turma")
                .in("email", emails);

              console.log('🔍 [TemaSubmissionsModal] Alunos encontrados:', alunos?.length || 0);
              console.log('🔍 [TemaSubmissionsModal] Detalhes dos alunos:',
                alunos?.map(a => ({ email: a.email, nome: a.nome_completo, turma: a.turma }))
              );

              if (alunosError) {
                console.error('❌ [TemaSubmissionsModal] Erro ao buscar alunos:', alunosError);
              }

              // Criar mapa de email => dados do aluno (normalizar email para garantir match)
              const alunosMap = new Map(
                (alunos || []).map(a => [
                  a.email.toLowerCase().trim(),
                  { nome: a.nome_completo, turma: a.turma }
                ])
              );

              // Mapear para usar dados reais da tabela alunos
              data = redacoesRegulares.map((r: any) => {
                // Normalizar email para buscar no Map
                const emailNormalizado = r.email_aluno?.toLowerCase().trim();
                const alunoData = alunosMap.get(emailNormalizado);

                console.log('🔍 [TemaSubmissionsModal] Mapeando redação:', {
                  email_original: r.email_aluno,
                  email_normalizado: emailNormalizado,
                  aluno_data: alunoData,
                  nome_completo: alunoData?.nome,
                  turma: alunoData?.turma
                });

                return {
                  nome_aluno: alunoData?.nome || r.email_aluno || 'Aluno',
                  email_aluno: r.email_aluno,
                  turma: alunoData?.turma || null,
                  nota_total: r.nota_total,
                  corrigida: r.corrigida,
                  status: r.status
                };
              });
            }
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
