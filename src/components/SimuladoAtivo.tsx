
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval, parseISO, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export const SimuladoAtivo = () => {
  const navigate = useNavigate();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const { data: simulados, isLoading } = useQuery({
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

  const getSimuladoStatus = (simulado: any) => {
    const agora = new Date();
    const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
    const fimSimulado = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);

    if (isBefore(agora, inicioSimulado)) {
      return 'agendado';
    } else if (isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado })) {
      return 'em_progresso';
    } else {
      return 'encerrado';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendado':
        return <Badge className="bg-blue-100 text-blue-800">Agendado</Badge>;
      case 'em_progresso':
        return <Badge className="bg-green-100 text-green-800">Em Progresso</Badge>;
      case 'encerrado':
        return <Badge className="bg-gray-100 text-gray-800">Encerrado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Indefinido</Badge>;
    }
  };

  const getActionButton = (simulado: any, status: string) => {
    switch (status) {
      case 'agendado':
        const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
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
            <Brain className="w-4 h-4 mr-2" />
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

  const shouldShowContent = (simulado: any, status: string) => {
    // Só mostra o conteúdo (frase temática) se o simulado estiver em progresso
    return status === 'em_progresso';
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando simulados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!simulados || simulados.length === 0) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Brain className="w-5 h-5" />
            Simulados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">
            Nenhum simulado disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filtrar apenas simulados relevantes (agendados ou em progresso)
  const simuladosRelevantes = simulados.filter(simulado => {
    const status = getSimuladoStatus(simulado);
    return status === 'agendado' || status === 'em_progresso';
  });

  if (simuladosRelevantes.length === 0) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Brain className="w-5 h-5" />
            Simulados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">
            Nenhum simulado agendado ou em progresso.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
        <Brain className="w-5 h-5" />
        Simulados
      </h2>
      
      {simuladosRelevantes.map((simulado) => {
        const status = getSimuladoStatus(simulado);
        const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
        
        return (
          <Card 
            key={simulado.id} 
            className={`border-2 transition-all duration-200 ${
              status === 'em_progresso' 
                ? 'border-green-300 bg-green-50' 
                : 'border-blue-200 bg-blue-50'
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  {simulado.titulo}
                </CardTitle>
                {getStatusBadge(status)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{format(inicioSimulado, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Só mostra frase temática se simulado estiver em progresso */}
              {shouldShowContent(simulado, status) && simulado.temas && (
                <div className="mb-4 p-4 bg-white rounded-lg border">
                  <h4 className="font-semibold text-primary mb-2">Tema da Redação:</h4>
                  <p className="text-gray-700 font-medium">
                    {simulado.temas.frase_tematica || simulado.frase_tematica}
                  </p>
                </div>
              )}
              
              <div className="flex justify-center">
                {getActionButton(simulado, status)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
