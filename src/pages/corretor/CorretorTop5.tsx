import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CorretorLayout } from "@/components/corretor/CorretorLayout";

const CorretorTop5 = () => {
  const [selectedType, setSelectedType] = useState<"simulado" | "regular" | "avulsa">("simulado");
  const [selectedSimulado, setSelectedSimulado] = useState<string>("");

  // Buscar maior nota de todas
  const { data: maiorNota } = useQuery({
    queryKey: ['maior-nota-geral-corretor'],
    queryFn: async () => {
      const [enviadasRes, simuladoRes, exercicioRes] = await Promise.all([
        supabase
          .from('redacoes_enviadas')
          .select('nome_aluno, nota_total')
          .not('nota_total', 'is', null)
          .order('nota_total', { ascending: false }),
        supabase
          .from('redacoes_simulado')
          .select('nome_aluno, nota_total')
          .not('nota_total', 'is', null)
          .order('nota_total', { ascending: false }),
        supabase
          .from('redacoes_exercicio')
          .select('nome_aluno, nota_total')
          .not('nota_total', 'is', null)
          .order('nota_total', { ascending: false })
      ]);

      const todasNotas = [
        ...(enviadasRes.data || []),
        ...(simuladoRes.data || []),
        ...(exercicioRes.data || [])
      ];

      if (todasNotas.length === 0) return null;

      const maiorNotaValor = Math.max(...todasNotas.map(r => r.nota_total));
      const alunosComMaiorNota = todasNotas.filter(r => r.nota_total === maiorNotaValor);
      
      return {
        nota: maiorNotaValor,
        alunos: [...new Set(alunosComMaiorNota.map(a => a.nome_aluno))]
      };
    }
  });

  // Buscar simulados disponíveis
  const { data: simulados } = useQuery({
    queryKey: ['simulados-lista-corretor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulados')
        .select('id, titulo')
        .order('titulo');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Buscar ranking baseado no tipo selecionado
  const { data: ranking } = useQuery({
    queryKey: ['ranking-corretor', selectedType, selectedSimulado],
    queryFn: async () => {
      let processedData = [];
      
      if (selectedType === "simulado") {
        // Para simulados, usar função otimizada que garante dupla correção
        const { data: simuladoData, error: simuladoError } = await supabase.rpc('reprocessar_ranking_simulados');
        
        if (simuladoError) throw simuladoError;
        
        // Filtrar por simulado específico se selecionado
        let filteredData = simuladoData || [];
        if (selectedSimulado && simulados) {
          const simuladoSelecionado = simulados.find(s => s.id === selectedSimulado);
          if (simuladoSelecionado) {
            filteredData = filteredData.filter(item => item.simulado_titulo === simuladoSelecionado.titulo);
          }
        }
        
        // Transformar dados para formato esperado
        processedData = filteredData.map(item => ({
          nome_aluno: item.nome_aluno,
          nota_total: Number(item.nota_media),
          simulados: { titulo: item.simulado_titulo }
        }));
      } else {
        // Para regular e avulsa, usar redacoes_enviadas
        let query = supabase
          .from('redacoes_enviadas')
          .select('nome_aluno, nota_total, tipo_envio')
          .not('nota_total', 'is', null)
          .eq('corrigida', true);
          
        if (selectedType === "regular") {
          query = query.eq('tipo_envio', 'regular');
        } else if (selectedType === "avulsa") {
          query = query.eq('tipo_envio', 'avulsa');
        }
        
        const { data, error } = await query.order('nota_total', { ascending: false });
        
        if (error) throw error;
        
        processedData = data || [];
      }
      
      // Processar ranking com lógica de empates justos
      const rankingComPosicao: Array<{
        posicao: number;
        nome_aluno: string;
        nota_total: number;
        simulado_titulo?: string;
      }> = [];
      
      // Obter as 5 notas distintas mais altas
      const notasUnicas = [...new Set(processedData.map(item => 
        selectedType === "simulado" ? Number(item.nota_total) : Number(item.nota_total)
      ))].sort((a, b) => Number(b) - Number(a));
      const top5Notas = notasUnicas.slice(0, 5);
      
      // Para cada uma das 5 notas mais altas, incluir TODOS os alunos com essa nota
      top5Notas.forEach((nota, index) => {
        const alunosComEssaNota = processedData.filter(item => 
          (selectedType === "simulado" ? item.nota_total : Number(item.nota_total)) === nota
        );
        const posicao = index + 1;
        
        alunosComEssaNota.forEach(aluno => {
          rankingComPosicao.push({
            posicao: posicao,
            nome_aluno: aluno.nome_aluno,
            nota_total: selectedType === "simulado" ? aluno.nota_total : Number(aluno.nota_total),
            simulado_titulo: aluno.simulados?.titulo
          });
        });
      });
      
      return rankingComPosicao;
    }
  });

  const getPosicaoIcon = (posicao: number) => {
    switch (posicao) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <Trophy className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <CorretorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Top 5</h1>
          <p className="text-gray-600">Ranking dos melhores desempenhos</p>
        </div>

        {/* Destaque da Maior Nota */}
        {maiorNota && (
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500 text-white">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">
                    🏆 Maior nota registrada
                  </CardTitle>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-yellow-600">{maiorNota.nota}</span>
                    <span className="text-gray-600 ml-1">pontos</span>
                  </div>
                  <p className="text-gray-700 font-medium">
                    {maiorNota.alunos.join(", ")}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Filtros e Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">🏅 Classificação Top 5</CardTitle>
            
            {/* Filtros */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Button
                variant={selectedType === "simulado" ? "default" : "outline"}
                onClick={() => setSelectedType("simulado")}
                size="sm"
              >
                Simulado
              </Button>
              <Button
                variant={selectedType === "regular" ? "default" : "outline"}
                onClick={() => setSelectedType("regular")}
                size="sm"
              >
                Regular
              </Button>
              <Button
                variant={selectedType === "avulsa" ? "default" : "outline"}
                onClick={() => setSelectedType("avulsa")}
                size="sm"
              >
                Visitante
              </Button>
            </div>

            {/* Filtro adicional para simulados */}
            {selectedType === "simulado" && simulados && simulados.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por simulado:
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedSimulado === "" ? "default" : "outline"}
                    onClick={() => setSelectedSimulado("")}
                    size="sm"
                  >
                    Todos
                  </Button>
                  {simulados.map(simulado => (
                    <Button
                      key={simulado.id}
                      variant={selectedSimulado === simulado.id ? "default" : "outline"}
                      onClick={() => setSelectedSimulado(simulado.id)}
                      size="sm"
                    >
                      {simulado.titulo}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {ranking && ranking.length > 0 ? (
              <div className="space-y-3">
                {ranking.map((item, index) => (
                  <div
                    key={`${item.nome_aluno}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg border bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      {getPosicaoIcon(item.posicao)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-900">
                            {item.posicao}º lugar
                          </span>
                        </div>
                        <div className="font-semibold text-gray-700">
                          {item.nome_aluno}
                        </div>
                        {item.simulado_titulo && (
                          <div className="text-sm text-gray-500">
                            {item.simulado_titulo}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {item.nota_total}
                      </div>
                      <div className="text-sm text-gray-500">
                        pontos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">Nenhuma redação corrigida ainda</p>
                <p className="text-sm text-gray-500">
                  O ranking aparecerá quando houver correções disponíveis
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CorretorLayout>
  );
};

export default CorretorTop5;