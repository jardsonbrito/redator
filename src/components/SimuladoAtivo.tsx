
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock, Calendar, AlertCircle, Flame } from "lucide-react";
import { format, isWithinInterval, parseISO, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface SimuladoAtivoProps {
  turmaCode: string;
}

export const SimuladoAtivo = ({ turmaCode }: SimuladoAtivoProps) => {
  const { toast } = useToast();

  const { data: simulados, refetch } = useQuery({
    queryKey: ['simulados-agendados', turmaCode],
    queryFn: async () => {
      const agora = new Date();
      const dataAtual = agora.toISOString().split('T')[0];

      let query = supabase
        .from('simulados')
        .select('*')
        .eq('ativo', true)
        .gte('data_fim', dataAtual);

      // Filtra por turma ou permite visitantes
      if (turmaCode === "visitante") {
        query = query.eq('permite_visitante', true);
      } else {
        query = query.or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`);
      }
      
      const { data, error } = await query.order('data_inicio', { ascending: true });
      
      if (error) throw error;
      
      // Filtra simulados que estão no período de exibição (desde hoje até o fim)
      const simuladosRelevantes = data?.filter(simulado => {
        const fimData = parseISO(simulado.data_fim);
        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999); // Considera o dia inteiro
        
        return hoje <= fimData;
      });

      return simuladosRelevantes || [];
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos para controle menos agressivo
  });

  // Se não há simulados, não renderiza nada
  if (!simulados || simulados.length === 0) {
    return null;
  }

  // Pega o primeiro simulado relevante
  const simuladoAtivo = simulados[0];

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
  let statusText;

  if (simuladoDisponivel) {
    statusBadge = <Badge className="bg-green-500 text-white font-bold">EM PROGRESSO</Badge>;
    cardClass = "border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg";
    statusText = "em progresso";
  } else if (simuladoFuturo) {
    statusBadge = <Badge className="bg-blue-500 text-white">AGENDADO</Badge>;
    cardClass = "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-md";
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
    <Card className={cardClass}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-orange-400 to-red-500">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className={`text-xl font-bold ${simuladoDisponivel ? 'text-green-800' : 'text-blue-800'}`}>
                🔥 Simulado
              </CardTitle>
              <p className="text-sm text-gray-600">Atividade agendada para sua turma</p>
            </div>
          </div>
          {statusBadge}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className={`font-bold text-lg mb-2 ${simuladoDisponivel ? 'text-green-800' : 'text-blue-800'}`}>
            {simuladoAtivo.titulo}
          </h3>
          
          {/* Só mostra a frase temática se o simulado estiver disponível */}
          {simuladoDisponivel && (
            <p className={`text-sm p-3 rounded-md ${simuladoDisponivel ? 'text-green-700 bg-green-100' : 'text-blue-700 bg-blue-100'}`}>
              <strong>Tema:</strong> {simuladoAtivo.frase_tematica}
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className={`flex items-center gap-2 p-2 rounded ${simuladoDisponivel ? 'text-green-700 bg-green-50' : 'text-blue-700 bg-blue-50'}`}>
            <Calendar className="w-4 h-4" />
            <span>
              <strong>Início:</strong> {format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
          <div className={`flex items-center gap-2 p-2 rounded ${simuladoDisponivel ? 'text-green-700 bg-green-50' : 'text-blue-700 bg-blue-50'}`}>
            <Clock className="w-4 h-4" />
            <span>
              <strong>Término:</strong> {format(fimSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>

        <div className="pt-2">
          {simuladoDisponivel ? (
            <Link to={`/simulados/${simuladoAtivo.id}`}>
              <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg py-3 shadow-lg">
                <ClipboardCheck className="w-5 h-5 mr-2" />
                🚀 Participar Agora!
              </Button>
            </Link>
          ) : (
            <div className="space-y-2">
              <Button 
                onClick={handleTentativaParticipacao}
                disabled={!simuladoDisponivel}
                className="w-full bg-gray-400 text-gray-200 cursor-not-allowed font-bold text-lg py-3"
              >
                <Clock className="w-5 h-5 mr-2" />
                Participar
              </Button>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <AlertCircle className="w-4 h-4" />
                <span>
                  Disponível a partir de {format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
