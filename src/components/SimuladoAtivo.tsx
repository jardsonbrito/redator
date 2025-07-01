
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock, Calendar, AlertCircle, Brain } from "lucide-react";
import { format, isWithinInterval, parseISO, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface SimuladoAtivoProps {
  turmaCode: string;
}

export const SimuladoAtivo = ({ turmaCode }: SimuladoAtivoProps) => {
  const { toast } = useToast();

  const { data: simuladoAtivo, isLoading, error } = useQuery({
    queryKey: ['simulado-ativo', turmaCode],
    queryFn: async () => {
      try {
        const agora = new Date();
        const dataAtual = agora.toISOString().split('T')[0];

        console.log('Buscando simulado ativo para turma:', turmaCode);

        let query = supabase
          .from('simulados')
          .select('*')
          .eq('ativo', true)
          .gte('data_fim', dataAtual)
          .order('data_inicio', { ascending: true });

        // Filtra por turma ou permite visitantes
        if (turmaCode === "visitante") {
          query = query.eq('permite_visitante', true);
        } else {
          query = query.or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`);
        }
        
        const { data, error } = await query.limit(1);
        
        if (error) {
          console.error('Erro ao buscar simulado:', error);
          return null;
        }
        
        if (!data || data.length === 0) {
          console.log('Nenhum simulado ativo encontrado');
          return null;
        }

        const simulado = data[0];
        console.log('Simulado encontrado:', simulado);

        // Verifica se o simulado ainda está no período de exibição
        const fimData = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);
        const agora = new Date();
        
        if (agora > fimData) {
          console.log('Simulado já encerrado, não será exibido');
          return null;
        }

        return simulado;
      } catch (error) {
        console.error('Erro na busca de simulado:', error);
        return null;
      }
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    retry: 2,
    staleTime: 0,
  });

  // Log de debug
  console.log('SimuladoAtivo - turmaCode:', turmaCode);
  console.log('SimuladoAtivo - simuladoAtivo:', simuladoAtivo);
  console.log('SimuladoAtivo - error:', error);
  console.log('SimuladoAtivo - isLoading:', isLoading);

  // Se não há simulado ou está carregando, não renderiza nada
  if (isLoading || !simuladoAtivo) {
    return null;
  }

  const agora = new Date();
  const inicioSimulado = parseISO(`${simuladoAtivo.data_inicio}T${simuladoAtivo.hora_inicio}`);
  const fimSimulado = parseISO(`${simuladoAtivo.data_fim}T${simuladoAtivo.hora_fim}`);
  
  const simuladoDisponivel = isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado });
  const simuladoFuturo = isBefore(agora, inicioSimulado);
  const simuladoEncerrado = isAfter(agora, fimSimulado);

  // Se já encerrou, não mostra
  if (simuladoEncerrado) {
    return null;
  }

  // Determina o status visual
  let statusBadge;
  let cardClass;
  let buttonClass;
  let statusText;

  if (simuladoDisponivel) {
    statusBadge = <Badge className="bg-green-500 text-white font-bold animate-pulse">EM PROGRESSO</Badge>;
    cardClass = "border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl";
    buttonClass = "w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg py-3 shadow-lg transform hover:scale-105 transition-all duration-200";
    statusText = "em progresso";
  } else if (simuladoFuturo) {
    statusBadge = <Badge className="bg-blue-500 text-white">AGENDADO</Badge>;
    cardClass = "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-lg";
    buttonClass = "w-full bg-gray-400 text-gray-200 cursor-not-allowed font-bold text-lg py-3";
    statusText = "agendado";
  }

  const handleTentativaParticipacao = () => {
    if (!simuladoDisponivel) {
      if (simuladoFuturo) {
        toast({
          title: "Simulado ainda não disponível",
          description: `O simulado estará disponível a partir de ${format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="mb-8">
      <Card className={cardClass}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className={`text-2xl font-bold ${simuladoDisponivel ? 'text-green-800' : 'text-blue-800'}`}>
                  🎯 Simulado Disponível
                </CardTitle>
                <p className="text-base text-gray-700 font-medium">Atividade agendada para sua turma</p>
              </div>
            </div>
            {statusBadge}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <h3 className={`font-bold text-xl mb-3 ${simuladoDisponivel ? 'text-green-800' : 'text-blue-800'}`}>
              {simuladoAtivo.titulo}
            </h3>
            
            {/* Informações do simulado - sem frase temática */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${simuladoDisponivel ? 'text-green-700 bg-green-100' : 'text-blue-700 bg-blue-100'}`}>
                <Calendar className="w-5 h-5" />
                <span>
                  <strong>Início:</strong> {format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-lg ${simuladoDisponivel ? 'text-green-700 bg-green-100' : 'text-blue-700 bg-blue-100'}`}>
                <Clock className="w-5 h-5" />
                <span>
                  <strong>Término:</strong> {format(fimSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            {simuladoDisponivel ? (
              <Link to={`/simulados/${simuladoAtivo.id}`}>
                <Button className={buttonClass}>
                  <ClipboardCheck className="w-6 h-6 mr-3" />
                  🚀 PARTICIPAR AGORA!
                </Button>
              </Link>
            ) : (
              <div className="space-y-3">
                <Button 
                  onClick={handleTentativaParticipacao}
                  disabled={!simuladoDisponivel}
                  className={buttonClass}
                >
                  <Clock className="w-5 h-5 mr-2" />
                  Participar
                </Button>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium">
                    Disponível a partir de {format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
