
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, ArrowRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { format, isWithinInterval, parseISO, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";

const Simulados = () => {
  const { studentData } = useStudentAuth();
  
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
        .eq('ativo', true)
        .order('data_inicio', { ascending: true });

      // Filtra simulados baseado na turma do usuário
      if (turmaCode === "Visitante") {
        query = query.eq('permite_visitante', true);
      } else {
        query = query.or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });

  const getStatusSimulado = (simulado: any) => {
    const agora = new Date();
    const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
    const fimSimulado = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);
    
    if (isBefore(agora, inicioSimulado)) {
      return { status: "Agendado", color: "bg-blue-100 border-blue-200", canParticipate: false, timeInfo: `Inicia em ${format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}` };
    } else if (isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado })) {
      return { status: "Em progresso", color: "bg-green-100 border-green-200", canParticipate: true, timeInfo: `Termina em ${format(fimSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}` };
    } else {
      return { status: "Encerrado", color: "bg-gray-100 border-gray-200", canParticipate: false, timeInfo: "" };
    }
  };

  if (isLoading) {
  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Simulados" />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">Carregando simulados...</div>
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
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-redator-primary mb-2">
            Simulados Disponíveis
          </h2>
          <p className="text-redator-accent">
            Participe dos simulados de redação com horário controlado e correção detalhada.
          </p>
        </div>

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
          <div className="grid gap-6">
            {simulados.map((simulado) => {
              const statusInfo = getStatusSimulado(simulado);

              return (
                <Card key={simulado.id} className={`${statusInfo.color} border transition-shadow`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {simulado.titulo}
                        </h3>
                        
                        {statusInfo.status === "Agendado" && (
                          <div className="space-y-2">
                            <Badge className="bg-blue-500 text-white font-medium">
                              Agendado
                            </Badge>
                            <p className="text-gray-700 text-sm">
                              {statusInfo.timeInfo}
                            </p>
                          </div>
                        )}
                        
                        {statusInfo.status === "Em progresso" && (
                          <div className="space-y-2">
                            <p className="text-gray-700 text-sm">
                              {statusInfo.timeInfo}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {statusInfo.canParticipate && (
                        <div className="ml-4">
                          <Link to={`/simulados/${simulado.id}`}>
                            <Button className="bg-green-600 hover:bg-green-700 text-white">
                              Participar do Simulado
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
};

export default Simulados;
