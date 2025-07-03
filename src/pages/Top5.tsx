import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Top5 = () => {
  const [selectedType, setSelectedType] = useState<"simulado" | "regular" | "avulsa">("simulado");
  const [selectedSimulado, setSelectedSimulado] = useState<string>("");

  // Buscar maior nota de todas
  const { data: maiorNota } = useQuery({
    queryKey: ['maior-nota-geral'],
    queryFn: async () => {
      // Buscar nas três tabelas: redacoes_enviadas, redacoes_simulado, redacoes_exercicio
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
    queryKey: ['simulados-lista'],
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
    queryKey: ['ranking', selectedType, selectedSimulado],
    queryFn: async () => {
      let query;
      
      if (selectedType === "simulado") {
        query = supabase
          .from('redacoes_simulado')
          .select(`
            nome_aluno,
            nota_total,
            simulados!inner(titulo)
          `)
          .not('nota_total', 'is', null);
          
        if (selectedSimulado) {
          query = query.eq('id_simulado', selectedSimulado);
        }
      } else {
        // Para regular e avulsa, usar redacoes_enviadas
        query = supabase
          .from('redacoes_enviadas')
          .select('nome_aluno, nota_total, tipo_envio')
          .not('nota_total', 'is', null);
          
        if (selectedType === "regular") {
          query = query.eq('tipo_envio', 'regular');
        } else if (selectedType === "avulsa") {
          query = query.eq('tipo_envio', 'avulsa');
        }
      }
      
      const { data, error } = await query.order('nota_total', { ascending: false });
      
      if (error) throw error;
      
      // Processar ranking com empates
      const rankingData = data || [];
      const rankingComPosicao: Array<{
        posicao: number;
        nome_aluno: string;
        nota_total: number;
        simulado_titulo?: string;
      }> = [];
      
      let posicaoAtual = 1;
      for (let i = 0; i < rankingData.length; i++) {
        if (i > 0 && rankingData[i].nota_total !== rankingData[i-1].nota_total) {
          posicaoAtual = i + 1;
        }
        
        rankingComPosicao.push({
          posicao: posicaoAtual,
          nome_aluno: rankingData[i].nome_aluno,
          nota_total: rankingData[i].nota_total,
          simulado_titulo: rankingData[i].simulados?.titulo
        });
        
        // Parar quando tivermos processado as 5 primeiras posições (mas incluindo empates)
        if (posicaoAtual > 5) break;
      }
      
      return rankingComPosicao;
    }
  });

  const getPosicaoIcon = (posicao: number) => {
    switch (posicao) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <Trophy className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5">
        <StudentHeader />
        
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Destaque da Maior Nota */}
          {maiorNota && (
            <Card className="mb-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full blur opacity-30"></div>
                    <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-lg">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      🏆 Maior nota registrada até agora
                    </CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-primary">{maiorNota.nota}</span>
                      <span className="text-lg text-muted-foreground ml-2">pontos</span>
                    </div>
                    <p className="text-lg font-medium text-secondary mt-1">
                      {maiorNota.alunos.join(", ")}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Filtros e Ranking */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                🏅 Classificação Top 5
              </CardTitle>
              
              {/* Filtros */}
              <div className="flex flex-wrap gap-3 mt-4">
                <Button
                  variant={selectedType === "simulado" ? "default" : "outline"}
                  onClick={() => setSelectedType("simulado")}
                  className="bg-primary/10 border-primary/30"
                >
                  Simulado
                </Button>
                <Button
                  variant={selectedType === "regular" ? "default" : "outline"}
                  onClick={() => setSelectedType("regular")}
                  className="bg-primary/10 border-primary/30"
                >
                  Regular
                </Button>
                <Button
                  variant={selectedType === "avulsa" ? "default" : "outline"}
                  onClick={() => setSelectedType("avulsa")}
                  className="bg-primary/10 border-primary/30"
                >
                  Visitante
                </Button>
              </div>

              {/* Filtro adicional para simulados */}
              {selectedType === "simulado" && simulados && simulados.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-primary mb-2">
                    Filtrar por simulado:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedSimulado === "" ? "default" : "outline"}
                      onClick={() => setSelectedSimulado("")}
                      size="sm"
                      className="bg-secondary/10 border-secondary/30"
                    >
                      Todos
                    </Button>
                    {simulados.map(simulado => (
                      <Button
                        key={simulado.id}
                        variant={selectedSimulado === simulado.id ? "default" : "outline"}
                        onClick={() => setSelectedSimulado(simulado.id)}
                        size="sm"
                        className="bg-secondary/10 border-secondary/30"
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
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white/50"
                    >
                      <div className="flex items-center gap-4">
                        {getPosicaoIcon(item.posicao)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-primary">
                              {item.posicao}º lugar
                            </span>
                          </div>
                          <div className="font-semibold text-secondary">
                            {item.nome_aluno}
                          </div>
                          {item.simulado_titulo && (
                            <div className="text-sm text-muted-foreground">
                              {item.simulado_titulo}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {item.nota_total}
                        </div>
                        <div className="text-sm text-muted-foreground">
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
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Top5;