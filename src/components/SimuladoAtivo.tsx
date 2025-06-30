
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock, Calendar, AlertCircle } from "lucide-react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

interface SimuladoAtivoProps {
  turmaCode: string;
}

export const SimuladoAtivo = ({ turmaCode }: SimuladoAtivoProps) => {
  const { data: simuladoAtivo } = useQuery({
    queryKey: ['simulado-ativo', turmaCode],
    queryFn: async () => {
      const agora = new Date();
      const dataAtual = agora.toISOString().split('T')[0];
      const horaAtual = agora.toTimeString().split(' ')[0].substring(0, 5);

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
      
      // Filtra simulados que estão no período ativo (considerando hora também)
      const simuladosAtivos = data?.filter(simulado => {
        const inicioSimulado = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
        const fimSimulado = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);
        return isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado });
      });

      return simuladosAtivos?.[0] || null; // Retorna apenas o primeiro simulado ativo
    },
    refetchInterval: 60000, // Atualiza a cada minuto
  });

  if (!simuladoAtivo) {
    return null;
  }

  const agora = new Date();
  const inicioSimulado = parseISO(`${simuladoAtivo.data_inicio}T${simuladoAtivo.hora_inicio}`);
  const fimSimulado = parseISO(`${simuladoAtivo.data_fim}T${simuladoAtivo.hora_fim}`);
  const simuladoDisponivel = isWithinInterval(agora, { start: inicioSimulado, end: fimSimulado });

  return (
    <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-green-600" />
            <CardTitle className="text-green-800">🔥 Simulado Ativo</CardTitle>
          </div>
          <Badge className="bg-green-500 text-white animate-pulse">
            AO VIVO
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-bold text-lg text-green-800 mb-2">{simuladoAtivo.titulo}</h3>
          <p className="text-sm text-green-700 bg-green-100 p-2 rounded">
            {simuladoAtivo.frase_tematica}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-green-700">
            <Calendar className="w-4 h-4" />
            <span>
              Início: {format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-green-700">
            <Clock className="w-4 h-4" />
            <span>
              Término: {format(fimSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>

        {simuladoDisponivel ? (
          <Link to={`/simulados/${simuladoAtivo.id}`}>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Participar Agora!
            </Button>
          </Link>
        ) : (
          <div className="text-center">
            <Button disabled className="w-full mb-2">
              <Clock className="w-4 h-4 mr-2" />
              Simulado Indisponível
            </Button>
            <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
              <AlertCircle className="w-3 h-3" />
              <span>
                Disponível apenas entre {format(inicioSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })} 
                {" e "} {format(fimSimulado, "dd/MM 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
