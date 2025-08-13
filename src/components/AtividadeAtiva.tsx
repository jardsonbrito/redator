import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Target, BookOpen, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval, parse, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { useNavigate } from "react-router-dom";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { ExerciseCard } from "@/components/ui/exercise-card";
import { getExerciseAvailability } from "@/utils/exerciseUtils";

export const AtividadeAtiva = () => {
  const navigate = useNavigate();
  const { studentData } = useStudentAuth();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Query para simulados ativos
  const { data: simulados, isLoading: loadingSimulados } = useQuery({
    queryKey: ['simulados-ativos'],
    queryFn: async () => {
      console.log('🎯 Carregando simulados ativos...');
      
      const { data, error } = await supabase
        .from('simulados')
        .select(`
          *,
          temas (
            frase_tematica,
            eixo_tematico
          )
        `)
        .eq('ativo', true)
        .order('data_inicio', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar simulados:', error);
        throw error;
      }

      console.log('✅ Simulados carregados:', data);
      return data || [];
    }
  });

  // Query para exercícios ativos e verificar se aluno já enviou redação
  const { data: exercicios, isLoading: loadingExercicios } = useQuery({
    queryKey: ['exercicios-ativos', studentData.email],
    queryFn: async () => {
      console.log('📝 Carregando exercícios ativos...');
      
      const { data: exerciciosData, error } = await supabase
        .from('exercicios')
        .select(`
          *,
          temas (
            frase_tematica,
            eixo_tematico,
            cover_url,
            cover_file_path
          )
        `)
        .eq('ativo', true)
        .order('data_inicio', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar exercícios:', error);
        throw error;
      }

      // Se há exercícios e temos email do aluno, verificar se já enviou redações
      if (exerciciosData?.length && studentData.email) {
        console.log('🔍 Verificando redações já enviadas para exercícios...');
        
        const { data: redacoesEnviadas, error: redacoesError } = await supabase
          .from('redacoes_exercicio')
          .select('exercicio_id')
          .ilike('email_aluno', studentData.email.toLowerCase().trim());

        if (redacoesError) {
          console.error('❌ Erro ao verificar redações enviadas:', redacoesError);
        }

        // Filtrar exercícios que o aluno ainda não enviou redação
        const exerciciosIdsEnviados = redacoesEnviadas?.map(r => r.exercicio_id) || [];
        const exerciciosDisponiveis = exerciciosData.filter(exercicio => 
          !exerciciosIdsEnviados.includes(exercicio.id)
        );

        console.log('✅ Exercícios disponíveis (sem redação enviada):', exerciciosDisponiveis.length);
        return exerciciosDisponiveis;
      }

      console.log('✅ Exercícios carregados:', exerciciosData?.length || 0);
      return exerciciosData || [];
    },
    enabled: !!studentData.email
  });

  const getSimuladoStatus = (simulado: any) => {
    if (!simulado.data_inicio || !simulado.hora_inicio || !simulado.data_fim || !simulado.hora_fim) {
      return 'disponivel';
    }

    const agora = new Date();
    const inicioSimulado = parse(`${simulado.data_inicio}T${simulado.hora_inicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
    const fimSimulado = parse(`${simulado.data_fim}T${simulado.hora_fim}`, "yyyy-MM-dd'T'HH:mm", new Date());

    if (isBefore(agora, inicioSimulado)) {
      return 'agendado';
    } else if (isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado })) {
      return 'em_progresso';
    } else {
      return 'encerrado';
    }
  };

  const getExercicioStatus = (exercicio: any) => {
    if (!exercicio.data_inicio || !exercicio.hora_inicio || !exercicio.data_fim || !exercicio.hora_fim) {
      return 'disponivel'; // Exercícios sem data são sempre disponíveis se ativos
    }

    const agora = new Date();
    const inicioExercicio = parse(`${exercicio.data_inicio}T${exercicio.hora_inicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
    const fimExercicio = parse(`${exercicio.data_fim}T${exercicio.hora_fim}`, "yyyy-MM-dd'T'HH:mm", new Date());

    if (isBefore(agora, inicioExercicio)) {
      return 'agendado';
    } else if (isWithinInterval(agora, { start: inicioExercicio, end: fimExercicio })) {
      return 'disponivel';
    } else {
      return 'encerrado';
    }
  };

  const hasUserAccess = (item: any) => {
    const isVisitante = studentData.userType === "visitante";
    const userTurma = studentData.turma;

    // Permitir se for visitante e permite visitante
    if (isVisitante && item.permite_visitante) {
      return true;
    }
    
    // Permitir se for aluno e está na turma autorizada ou se turmas_autorizadas está vazio/null
    if (!isVisitante && userTurma && userTurma !== "visitante") {
      const turmasAutorizadas = item.turmas_autorizadas || [];
      return turmasAutorizadas.length === 0 || 
        turmasAutorizadas.some((turma: string) => turma.toUpperCase() === userTurma.toUpperCase());
    }

    return false;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendado':
        return <Badge className="bg-blue-100 text-blue-800">📅 Agendado</Badge>;
      case 'em_progresso':
      case 'disponivel':
        return <Badge className="bg-green-100 text-green-800">🔴 Disponível</Badge>;
      case 'encerrado':
        return <Badge className="bg-gray-100 text-gray-800">⏰ Encerrado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Indefinido</Badge>;
    }
  };

  const getSimuladoActionButton = (simulado: any, status: string) => {
    switch (status) {
      case 'agendado':
        if (!simulado.data_inicio || !simulado.hora_inicio) return null;
        const inicioSimulado = parse(`${simulado.data_inicio}T${simulado.hora_inicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
        return (
          <Button variant="outline" disabled>
            <Clock className="w-4 h-4 mr-2" />
            Inicia em {format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
          </Button>
        );
      case 'em_progresso':
        return (
          <Button 
            onClick={() => navigate(`/simulados/${simulado.id}`)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Target className="w-4 h-4 mr-2" />
            Participar do Simulado
          </Button>
        );
      case 'encerrado':
        return (
          <Button variant="outline" disabled>
            <Clock className="w-4 h-4 mr-2" />
            Simulado Encerrado
          </Button>
        );
      default:
        return null;
    }
  };

  if (loadingSimulados || loadingExercicios) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando atividades...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 1. PRIORIDADE: Verificar simulados ativos primeiro
  if (simulados && simulados.length > 0) {
    const simuladosRelevantes = simulados.filter(simulado => {
      const status = getSimuladoStatus(simulado);
      const hasAccess = hasUserAccess(simulado);
      return (status === 'agendado' || status === 'em_progresso') && hasAccess;
    });

    if (simuladosRelevantes.length > 0) {
      // Renderizar simulados usando o fluxo atual
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
            <Target className="w-5 h-5" />
            Simulados Disponíveis
          </h2>
          
          {simuladosRelevantes.map((simulado) => {
            const status = getSimuladoStatus(simulado);
            if (!simulado.data_inicio || !simulado.hora_inicio || !simulado.data_fim || !simulado.hora_fim) return null;
            const inicioSimulado = parse(`${simulado.data_inicio}T${simulado.hora_inicio}`, "yyyy-MM-dd'T'HH:mm", new Date());
            const fimSimulado = parse(`${simulado.data_fim}T${simulado.hora_fim}`, "yyyy-MM-dd'T'HH:mm", new Date());
            const isExpanded = expandedCard === simulado.id;

            return (
              <Card 
                key={simulado.id} 
                className={`border-2 transition-all duration-200 ${
                  status === 'em_progresso' 
                    ? 'border-green-300 bg-green-50 shadow-lg' 
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => setExpandedCard(isExpanded ? null : simulado.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      🎯 {simulado.titulo}
                    </CardTitle>
                    {getStatusBadge(status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(inicioSimulado, "dd/MM", { locale: ptBR })} - {format(fimSimulado, "dd/MM", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{format(inicioSimulado, "HH:mm", { locale: ptBR })} - {format(fimSimulado, "HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {isExpanded && (
                    <div className="mb-4 p-4 bg-white rounded-lg border">
                      <h4 className="font-semibold text-primary mb-2">Tema da Redação:</h4>
                      <p className="text-gray-700 font-medium">
                        {simulado.temas?.frase_tematica || simulado.frase_tematica}
                      </p>
                      {simulado.temas?.eixo_tematico && (
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Eixo temático:</strong> {simulado.temas.eixo_tematico}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>
                        {simulado.permite_visitante ? 'Aberto a todos' : 'Turmas específicas'}
                      </span>
                    </div>
                    
                    {getSimuladoActionButton(simulado, status)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }
  }

  // 2. SEGUNDA PRIORIDADE: Verificar exercícios ativos
  if (exercicios && exercicios.length > 0) {
    const exerciciosDisponiveis = exercicios.filter(exercicio => {
      const status = getExercicioStatus(exercicio);
      const hasAccess = hasUserAccess(exercicio);
      return status === 'disponivel' && hasAccess;
    });

    if (exerciciosDisponiveis.length > 0) {
      // Renderizar exercícios com suas capas usando o ExerciseCard
      const handleExerciseAction = (exercicio: any) => {
        const availability = getExerciseAvailability(exercicio);
        
        if (availability.status === 'agendado') {
          alert('Este exercício ainda não está disponível. Aguarde a data de início.');
          return;
        }
        if (availability.status === 'encerrado') {
          alert('Este exercício está encerrado. Você pode visualizar a proposta, mas não pode mais respondê-lo.');
          return;
        }

        if (exercicio.tipo === 'Google Forms' && exercicio.link_forms) {
          if (exercicio.abrir_aba_externa) {
            window.open(exercicio.link_forms, '_blank');
          } else {
            navigate('/exercicios');
          }
        } else if (exercicio.tipo === 'Redação com Frase Temática' && exercicio.tema_id) {
          navigate(`/temas/${exercicio.tema_id}?exercicio=${exercicio.id}`);
        }
      };

      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Exercícios Disponíveis
          </h2>
          
          <div className="space-y-4">
            {exerciciosDisponiveis.map((exercicio) => (
              <ExerciseCard
                key={exercicio.id}
                exercise={exercicio}
                onAction={handleExerciseAction}
                showActions={true}
                isAdmin={false}
              />
            ))}
          </div>
        </div>
      );
    }
  }

  // 3. NENHUMA ATIVIDADE DISPONÍVEL
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Target className="w-5 h-5" />
          Atividades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-center py-4">
          Nenhuma atividade disponível no momento.
        </p>
      </CardContent>
    </Card>
  );
};