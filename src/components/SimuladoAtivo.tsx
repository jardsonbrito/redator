
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

        console.log('🔍 Buscando simulado ativo para turma:', turmaCode);

        let query = supabase
          .from('simulados')
          .select('*')
          .eq('ativo', true)
          .gte('data_fim', dataAtual)
          .order('data_inicio', { ascending: true });

        // Filtra por turma ou permite visitantes - NOMES CORRETOS DAS TURMAS
        if (turmaCode === "Visitante" || turmaCode === "visitante") {
          query = query.eq('permite_visitante', true);
        } else {
          // Usar tanto o formato exato da turma quanto permitir visitantes
          query = query.or(`turmas_autorizadas.cs.{${turmaCode}},permite_visitante.eq.true`);
        }
        
        const { data, error } = await query.limit(1);
        
        if (error) {
          console.error('❌ Erro ao buscar simulado:', error);
          return null;
        }
        
        if (!data || data.length === 0) {
          console.log('ℹ️ Nenhum simulado ativo encontrado para turma:', turmaCode);
          return null;
        }

        const simulado = data[0];
        console.log('✅ Simulado encontrado:', simulado.titulo, 'ID:', simulado.id);

        // Verifica se o simulado ainda está no período de exibição
        const fimData = parseISO(`${simulado.data_fim}T${simulado.hora_fim}`);
        
        if (agora > fimData) {
          console.log('⏰ Simulado já encerrado, não será exibido');
          return null;
        }

        // Publicar tema automaticamente se simulado iniciou e tema está em rascunho
        const inicioData = parseISO(`${simulado.data_inicio}T${simulado.hora_inicio}`);
        if (agora >= inicioData && simulado.tema_id) {
          console.log('📝 Verificando se tema precisa ser publicado...');
          try {
            await supabase.rpc('check_and_publish_expired_simulados');
          } catch (error) {
            console.error('❌ Erro ao publicar tema:', error);
          }
        }

        return simulado;
      } catch (error) {
        console.error('❌ Erro na busca de simulado:', error);
        return null;
      }
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    retry: 2,
    staleTime: 0,
  });

  // Log para debug
  console.log('🎯 SimuladoAtivo - Loading:', isLoading, 'Data:', simuladoAtivo, 'Error:', error);

  // Se está carregando, mostrar indicador
  if (isLoading) {
    return (
      <div className="mb-8">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando simulados disponíveis...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não há simulado, não renderiza nada
  if (!simuladoAtivo) {
    console.log('ℹ️ Nenhum simulado para exibir na Home');
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
  let statusText;

  if (simuladoDisponivel) {
    statusBadge = <Badge className="bg-green-500 text-white font-bold animate-pulse">EM PROGRESSO</Badge>;
    cardClass = "border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl";
    statusText = "em progresso";
  } else if (simuladoFuturo) {
    statusBadge = <Badge className="bg-blue-500 text-white">AGENDADO</Badge>;
    cardClass = "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-lg";
    statusText = "agendado";
  }

  return (
    <div className="mb-8">
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
        <div className={`bg-gradient-to-r p-1 ${simuladoDisponivel ? 'from-green-400 to-emerald-500' : 'from-blue-400 to-cyan-500'}`}>
          <CardHeader className="bg-white/95 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-2xl blur ${simuladoDisponivel ? 'bg-green-400' : 'bg-blue-400'} opacity-30`}></div>
                  <div className={`relative flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl ${simuladoDisponivel ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'}`}>
                    <Brain className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div>
                  <CardTitle className={`text-3xl font-extrabold ${simuladoDisponivel ? 'text-green-700' : 'text-blue-700'}`}>
                    🎯 Simulado Disponível
                  </CardTitle>
                  <p className={`text-lg font-semibold ${simuladoDisponivel ? 'text-green-600' : 'text-blue-600'}`}>
                    ⚡ {simuladoAtivo.titulo}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {statusBadge}
                {simuladoDisponivel && (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    ⏰ ATIVO AGORA
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </div>
        
        <CardContent className="space-y-6">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            {/* Informações do simulado - apenas turma e horários */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
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

            {/* Informação da turma - NOMES CORRETOS */}
            <div className={`p-3 rounded-lg ${simuladoDisponivel ? 'text-green-700 bg-green-100' : 'text-blue-700 bg-blue-100'}`}>
              <span className="font-medium">
                Turma: {turmaCode === "Visitante" || turmaCode === "visitante" ? "Visitantes" : turmaCode}
              </span>
            </div>
          </div>

          <div className="pt-2">
            {simuladoDisponivel ? (
              <Link to={`/simulado/${simuladoAtivo.id}`}>
                <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg py-3 shadow-lg transform hover:scale-105 transition-all duration-200">
                  <ClipboardCheck className="w-6 h-6 mr-3" />
                  🚀 PARTICIPAR AGORA!
                </Button>
              </Link>
            ) : (
              <div className="space-y-3">
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
