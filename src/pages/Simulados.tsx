
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
      return { status: "Agendado", color: "bg-blue-500", canParticipate: false };
    } else if (isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado })) {
      return { status: "Em progresso", color: "bg-green-500", canParticipate: true };
    } else {
      return { status: "Encerrado", color: "bg-gray-500", canParticipate: false };
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader pageTitle="Simulados" />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">Carregando simulados...</div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
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
              const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
              const fimSimulado = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);

              return (
                <Card key={simulado.id} className="border-l-4 border-l-redator-primary hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{simulado.titulo}</CardTitle>
                        {/* NÃO MOSTRAR frase temática na listagem conforme solicitado */}
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge className={`${statusInfo.color} text-white font-medium`}>
                            {statusInfo.status}
                          </Badge>
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            Turma: {turmaCode}
                          </Badge>
                          {simulado.permite_visitante && (
                            <Badge variant="outline" className="text-redator-secondary">
                              Aceita visitantes
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Início: {format(inicioSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              Término: {format(fimSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Link to={`/simulados/${simulado.id}`}>
                          <Button 
                            variant={statusInfo.canParticipate ? "default" : "outline"}
                            size="sm"
                            className={statusInfo.canParticipate ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {statusInfo.status === "Encerrado" ? "Ver Proposta" : 
                             statusInfo.canParticipate ? "Participar" : "Ver Detalhes"}
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
    </ProtectedRoute>
  );
};

export default Simulados;
