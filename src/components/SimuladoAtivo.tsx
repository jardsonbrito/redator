
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

  const { data: simuladoAtivo } = useQuery({
    queryKey: ['simulado-ativo', turmaCode],
    queryFn: async () => {
      const agora = new Date();
      const dataAtual = agora.toISOString().split('T')[0];

      let query = supabase
        .from('simulados')
        .select('*')
        .eq('ativo', true)
        .lte('data_inicio', dataAtual)
        .gte('data_fim', dataAtual);

      // Filtra por turma ou permite visitantes
      if (turmaCode === "visitante") {
        query = query.eq('permite_visitante', true);
      } else {
        query = query.or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`);
      }
      
      const { data, error } = await query.order('data_inicio', { ascending: true });
      
      if (error) throw error;
      
      // Filtra simulados que estão no período de exibição (desde o dia de início até o fim)
      const simuladosRelevantes = data?.filter(simulado => {
        const inicioData = parseISO(simulado.data_inicio);
        const fimData = parseISO(simulado.data_fim);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        return hoje >= inicioData && hoje <= fimData;
      });

      return simuladosRelevantes?.[0] || null; // Retorna apenas o primeiro simulado relevante
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos para controle preciso
  });

  if (!simuladoAtivo) {
    return null;
  }

  const agora = new Date();
  const inicioSimulado = parseISO(`${simuladoAtivo.data_inicio}T${simuladoAtivo.hora_inicio}`);
  const fimSimulado = parseISO(`${simuladoAtivo.data_fim}T${simuladoAtivo.hora_fim}`);
  
  const simuladoDisponivel = isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado });
  const simuladoFuturo = isBefore(agora, inicioSimulado);
  const simuladoEncerrado = isAfter(agora, fimSimulado);

  // Determina o status visual
  let statusBadge;
  let cardClass;
  if (simuladoDisponivel) {
    statusBadge = <Badge className="bg-red-500 text-white animate-pulse font-bold">🔥 AO VIVO</Badge>;
    cardClass = "border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg";
  } else if (simuladoFuturo) {
    statusBadge = <Badge className="bg-blue-500 text-white">📅 AGENDADO</Badge>;
    cardClass = "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-md";
  } else {
    // Simulado encerrado - não deveria aparecer aqui, mas por segurança
    return null;
  }

  const handleTentativaParticipacao = () => {
    if (!simuladoDisponivel) {
      if (simuladoFuturo) {
        toast({
          title: "Simulado ainda não disponível",
          description: `O simulado estará disponível a partir de ${format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Simulado encerrado",
          description: "Este simulado já foi encerrado.",
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
              <CardTitle className={`text-xl font-bold ${simuladoDisponivel ? 'text-red-800' : 'text-blue-800'}`}>
                🎯 Simulado em Destaque
              </CardTitle>
              <p className="text-sm text-gray-600">Atividade agendada para sua turma</p>
            </div>
          </div>
          {statusBadge}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className={`font-bold text-lg mb-2 ${simuladoDisponivel ? 'text-red-800' : 'text-blue-800'}`}>
            {simuladoAtivo.titulo}
          </h3>
          <p className={`text-sm p-3 rounded-md ${simuladoDisponivel ? 'text-red-700 bg-red-100' : 'text-blue-700 bg-blue-100'}`}>
            <strong>Tema:</strong> {simuladoAtivo.frase_tematica}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className={`flex items-center gap-2 p-2 rounded ${simuladoDisponivel ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50'}`}>
            <Calendar className="w-4 h-4" />
            <span>
              <strong>Início:</strong> {format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
          <div className={`flex items-center gap-2 p-2 rounded ${simuladoDisponivel ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50'}`}>
            <Clock className="w-4 h-4" />
            <span>
              <strong>Término:</strong> {format(fimSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>

        <div className="pt-2">
          {simuladoDisponivel ? (
            <Link to={`/simulados/${simuladoAtivo.id}`}>
              <Button className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-lg py-3 shadow-lg">
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
                  {simuladoFuturo 
                    ? `Disponível a partir de ${format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}`
                    : "Simulado encerrado"
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
