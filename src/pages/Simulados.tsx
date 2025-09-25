
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calendar, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { computeSimuladoStatus, getSimuladoStatusInfo } from "@/utils/simuladoStatus";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SimuladoCardPadrao } from "@/components/shared/SimuladoCardPadrao";
import { useSimuladoSubmission } from "@/hooks/useSimuladoSubmission";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Fortaleza';

const Simulados = () => {
  // Configurar título da página
  usePageTitle('Simulados');
  
  const { studentData } = useStudentAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Determina a turma do usuário - NOMES CORRETOS DAS TURMAS (sem anos)
  let turmaCode = "Visitante";
  if (studentData.userType === "aluno" && studentData.turma) {
    turmaCode = studentData.turma; // Usar o nome real da turma
  }

const { data: simulados, isLoading } = useQuery({
  queryKey: ['simulados', turmaCode],
  queryFn: async () => {
    let query = supabase
      .from('simulados')
      .select('*')
      .eq('ativo', true);

    const { data: sims, error } = await query;
    if (error) throw error;

    // Filtrar simulados baseado na turma do usuário no frontend para controle total
    const simuladosFiltrados = (sims || []).filter((simulado) => {
      const turmasAutorizadas = simulado.turmas_autorizadas || [];
      const permiteVisitante = simulado.permite_visitante;

      if (turmaCode === "Visitante") {
        // Visitantes só veem simulados que permitem visitantes
        return permiteVisitante;
      } else {
        // Alunos veem apenas simulados da sua turma específica
        // Simulados exclusivos para visitantes (permite_visitante=true E sem turmas) NÃO são vistos por turmas
        return turmasAutorizadas.includes(turmaCode);
      }
    });

    const temaIds = Array.from(new Set(simuladosFiltrados.map((s: any) => s.tema_id).filter(Boolean)));
    let temasMap: Record<string, any> = {};
    if (temaIds.length > 0) {
      const { data: temas } = await supabase
        .from('temas')
        .select('id, frase_tematica, eixo_tematico, cover_file_path, cover_url')
        .in('id', temaIds as string[]);
      temasMap = (temas || []).reduce((acc: any, t: any) => { acc[t.id] = t; return acc; }, {});
    }

    const simuladosComTema = simuladosFiltrados.map((s: any) => ({ ...s, tema: s.tema_id ? temasMap[s.tema_id] || null : null }));

    // Ordenar simulados baseado no status e datas (timezone Fortaleza)
    return simuladosComTema.sort((a: any, b: any) => {
      const now = dayjs().tz(TZ);
      
      const aInicio = dayjs.tz(`${a.data_inicio} ${a.hora_inicio}`, 'YYYY-MM-DD HH:mm', TZ);
      const aFim = dayjs.tz(`${a.data_fim} ${a.hora_fim}`, 'YYYY-MM-DD HH:mm', TZ);
      const bInicio = dayjs.tz(`${b.data_inicio} ${b.hora_inicio}`, 'YYYY-MM-DD HH:mm', TZ);
      const bFim = dayjs.tz(`${b.data_fim} ${b.hora_fim}`, 'YYYY-MM-DD HH:mm', TZ);
      
      const aStatus = computeSimuladoStatus(a);
      const bStatus = computeSimuladoStatus(b);
      
      // 1. Em andamento (primeiro)
      if (aStatus === 'ativo' && bStatus !== 'ativo') return -1;
      if (bStatus === 'ativo' && aStatus !== 'ativo') return 1;
      if (aStatus === 'ativo' && bStatus === 'ativo') {
        return aInicio.isBefore(bInicio) ? -1 : 1;
      }
      
      // 2. Agendados (segundo)
      if (aStatus === 'agendado' && bStatus === 'encerrado') return -1;
      if (bStatus === 'agendado' && aStatus === 'encerrado') return 1;
      if (aStatus === 'agendado' && bStatus === 'agendado') {
        return aInicio.isBefore(bInicio) ? -1 : 1;
      }
      
      // 3. Encerrados (último) - ordenados por fim desc (mais recente primeiro)
      if (aStatus === 'encerrado' && bStatus === 'encerrado') {
        return aFim.isAfter(bFim) ? -1 : 1;
      }
      
      return 0;
    });
  }
});

const getStatusSimulado = (simulado: any) => {
  const status = computeSimuladoStatus(simulado);
  return getSimuladoStatusInfo(status, simulado);
};

// Componente wrapper para usar o hook de submissão
const SimuladoWithSubmissionWrapper = ({ simulado, navigate }: { simulado: any; navigate: any }) => {
  const { data: submissionData } = useSimuladoSubmission(simulado.id);
  const { studentData } = useStudentAuth();

  // Determinar status de submissão para exibir badge correto
  let submissionStatus: 'ENVIADO' | 'AUSENTE' | undefined;
  if (computeSimuladoStatus(simulado) === 'encerrado') {
    submissionStatus = submissionData?.hasSubmitted ? 'ENVIADO' : 'AUSENTE';
  }

  // Buscar nota média se o simulado estiver encerrado e o aluno tiver enviado
  const { data: notaData } = useQuery({
    queryKey: ['simulado-nota', simulado.id, studentData.email],
    queryFn: async () => {
      if (submissionStatus !== 'ENVIADO') return null;

      const { data, error } = await supabase
        .from('redacoes_simulado')
        .select('nota_final_corretor_1, nota_final_corretor_2')
        .eq('id_simulado', simulado.id)
        .ilike('email_aluno', studentData.email.toLowerCase().trim())
        .single();

      if (error || !data) return null;

      // Calcular média das duas correções (se ambas existirem)
      const nota1 = data.nota_final_corretor_1;
      const nota2 = data.nota_final_corretor_2;

      if (nota1 !== null && nota2 !== null) {
        return (nota1 + nota2) / 2;
      } else if (nota1 !== null) {
        return nota1;
      } else if (nota2 !== null) {
        return nota2;
      }

      return null;
    },
    enabled: !!studentData.email && submissionStatus === 'ENVIADO'
  });

  const simuladoWithSubmission = {
    ...simulado,
    hasSubmitted: submissionData?.hasSubmitted,
    submissionStatus,
    notaMedia: notaData
  };

  return (
    <SimuladoCardPadrao
      simulado={simuladoWithSubmission}
      perfil="aluno"
      actions={{
        onVerSimulado: (id) => {
          // Se o simulado está ativo e o aluno não enviou, permitir participação
          const status = computeSimuladoStatus(simulado);
          if (status === 'ativo' && !simuladoWithSubmission.hasSubmitted) {
            navigate(`/simulados/${id}`);
          } else if (simuladoWithSubmission.hasSubmitted || simuladoWithSubmission.submissionStatus === 'ENVIADO') {
            // Se o aluno já enviou (independente do status), ir para a página de redação
            navigate(`/simulados/${id}/redacao-corrigida`);
          }
        }
      }}
    />
  );
};


if (isLoading) {
  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Simulados" />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-md h-80 animate-pulse">
                <div className="w-full h-40 bg-gray-200 rounded-t-xl"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md h-80 animate-pulse">
                <div className="w-full h-40 bg-gray-200 rounded-t-xl"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md h-80 animate-pulse">
                <div className="w-full h-40 bg-gray-200 rounded-t-xl"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Simulados" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

{!simulados || simulados.length === 0 ? (
  <Card>
    <CardContent className="text-center py-12">
      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-600 mb-2">
        Nenhum simulado disponível
      </h3>
      <p className="text-gray-500">
        Não há simulados disponíveis para sua turma no momento.
      </p>
    </CardContent>
  </Card>
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {simulados.map((simulado: any) => (
      <SimuladoWithSubmissionWrapper
        key={simulado.id}
        simulado={simulado}
        navigate={navigate}
      />
    ))}
  </div>
)}
      </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Simulados;
