import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Top5WidgetProps {
  showHeader?: boolean;
  variant?: "student" | "corretor";
}

export const Top5Widget = ({ showHeader = true, variant = "student" }: Top5WidgetProps) => {
  const [selectedType, setSelectedType] = useState<"simulado" | "regular" | "avulsa">("simulado");
  const [selectedSimulado, setSelectedSimulado] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

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

  // Buscar meses disponíveis para redações regulares
  const { data: mesesDisponiveis } = useQuery({
    queryKey: ['meses-regulares'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redacoes_enviadas')
        .select('data_envio')
        .eq('tipo_envio', 'regular')
        .eq('corrigida', true)
        .not('nota_total', 'is', null);
      
      if (error) throw error;
      
      // Extrair meses únicos
      const meses = new Set<string>();
      (data || []).forEach(redacao => {
        const dataRedacao = new Date(redacao.data_envio);
        const mes = dataRedacao.toLocaleDateString('pt-BR', { 
          month: 'long', 
          year: 'numeric' 
        });
        const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
        meses.add(mesCapitalizado);
      });
      
      return Array.from(meses).sort() as string[];
    }
  });

  // Buscar ranking baseado no tipo selecionado
  const { data: ranking } = useQuery({
    queryKey: ['ranking', selectedType, selectedSimulado, selectedMonth],
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
          .select('nome_aluno, nota_total, tipo_envio, data_envio')
          .not('nota_total', 'is', null)
          .eq('corrigida', true);
          
        if (selectedType === "regular") {
          query = query.eq('tipo_envio', 'regular');
        } else if (selectedType === "avulsa") {
          query = query.eq('tipo_envio', 'avulsa');
        }
        
        const { data, error } = await query.order('nota_total', { ascending: false });
        
        if (error) throw error;
        
        let filteredData = data || [];
        
        // Filtrar por mês se for tipo "regular" e um mês estiver selecionado
        if (selectedType === "regular" && selectedMonth) {
          filteredData = filteredData.filter(redacao => {
            const dataRedacao = new Date(redacao.data_envio);
            const mesRedacao = dataRedacao.toLocaleDateString('pt-BR', { 
              month: 'long', 
              year: 'numeric' 
            });
            const mesCapitalizado = mesRedacao.charAt(0).toUpperCase() + mesRedacao.slice(1);
            return mesCapitalizado === selectedMonth;
          });
        }
        
        processedData = filteredData;
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
      default: return <Trophy className="w-5 h-5 text-primary" />;
    }
  };

  const getCardStyles = () => {
    if (variant === "student") {
      return {
        container: "bg-white/80 backdrop-blur-sm border-0 shadow-xl",
        majorNoteCard: "mb-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-primary/20",
        majorNoteIcon: "absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full blur opacity-30",
        majorNoteIconBg: "relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-lg",
        majorNoteTitle: "text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent",
        majorNoteValue: "text-3xl font-bold text-primary",
        majorNoteNames: "text-lg font-medium text-secondary",
        title: "text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent",
        buttonActive: "bg-primary text-primary-foreground hover:bg-primary/90",
        buttonInactive: "bg-primary/10 border-primary/30 hover:bg-primary/20",
        buttonSecondaryActive: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        buttonSecondaryInactive: "bg-secondary/10 border-secondary/30 hover:bg-secondary/20",
        rankingItem: "flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white/50",
        rankingPosition: "text-lg font-bold text-primary",
        rankingName: "font-semibold text-secondary",
        rankingScore: "text-2xl font-bold text-primary"
      };
    } else {
      return {
        container: "",
        majorNoteCard: "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200",
        majorNoteIcon: "",
        majorNoteIconBg: "flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500 text-white",
        majorNoteTitle: "text-xl text-gray-900",
        majorNoteValue: "text-2xl font-bold text-yellow-600",
        majorNoteNames: "text-gray-700 font-medium",
        title: "text-xl",
        buttonActive: "",
        buttonInactive: "",
        buttonSecondaryActive: "",
        buttonSecondaryInactive: "",
        rankingItem: "flex items-center justify-between p-4 rounded-lg border bg-gray-50",
        rankingPosition: "text-lg font-bold text-gray-900",
        rankingName: "font-semibold text-gray-700",
        rankingScore: "text-2xl font-bold text-gray-900"
      };
    }
  };

  const styles = getCardStyles();

  return (
    <div className="space-y-6">
      {/* Destaque da Maior Nota */}
      {maiorNota && (
        <Card className={styles.majorNoteCard}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="relative">
                {variant === "student" && (
                  <div className={styles.majorNoteIcon}></div>
                )}
                <div className={styles.majorNoteIconBg}>
                  <Crown className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className={styles.majorNoteTitle}>
                  🏆 Maior nota registrada até agora
                </CardTitle>
                <div className="mt-2">
                  <span className={styles.majorNoteValue}>{maiorNota.nota}</span>
                  <span className="text-lg text-muted-foreground ml-2">pontos</span>
                </div>
                <p className={`${styles.majorNoteNames} mt-1`}>
                  {maiorNota.alunos.join(", ")}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Filtros e Ranking */}
      <Card className={styles.container}>
        <CardHeader>
          <CardTitle className={styles.title}>
            🏅 Classificação Top 5
          </CardTitle>
          
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Button
              variant={selectedType === "simulado" ? "default" : "outline"}
              onClick={() => setSelectedType("simulado")}
              className={variant === "student" ? (selectedType === "simulado" ? styles.buttonActive : styles.buttonInactive) : ""}
              size={variant === "corretor" ? "sm" : undefined}
            >
              Simulado
            </Button>
            <Button
              variant={selectedType === "regular" ? "default" : "outline"}
              onClick={() => setSelectedType("regular")}
              className={variant === "student" ? (selectedType === "regular" ? styles.buttonActive : styles.buttonInactive) : ""}
              size={variant === "corretor" ? "sm" : undefined}
            >
              Regular
            </Button>
            <Button
              variant={selectedType === "avulsa" ? "default" : "outline"}
              onClick={() => setSelectedType("avulsa")}
              className={variant === "student" ? (selectedType === "avulsa" ? styles.buttonActive : styles.buttonInactive) : ""}
              size={variant === "corretor" ? "sm" : undefined}
            >
              Visitante
            </Button>
          </div>

          {/* Filtro adicional para simulados */}
          {selectedType === "simulado" && simulados && simulados.length > 0 && (
            <div className="mt-4">
              <label className={`block text-sm font-medium mb-2 ${variant === "student" ? "text-primary" : "text-gray-700"}`}>
                Filtrar por simulado:
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedSimulado === "" ? "default" : "outline"}
                  onClick={() => setSelectedSimulado("")}
                  size="sm"
                  className={variant === "student" ? (selectedSimulado === "" ? styles.buttonSecondaryActive : styles.buttonSecondaryInactive) : ""}
                >
                  Todos
                </Button>
                {simulados.map(simulado => (
                  <Button
                    key={simulado.id}
                    variant={selectedSimulado === simulado.id ? "default" : "outline"}
                    onClick={() => setSelectedSimulado(simulado.id)}
                    size="sm"
                    className={variant === "student" ? (selectedSimulado === simulado.id ? styles.buttonSecondaryActive : styles.buttonSecondaryInactive) : ""}
                  >
                    {simulado.titulo}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Filtro adicional para aba Regular */}
          {selectedType === "regular" && mesesDisponiveis && mesesDisponiveis.length > 0 && (
            <div className="mt-4">
              <label className={`block text-sm font-medium mb-2 ${variant === "student" ? "text-primary" : "text-gray-700"}`}>
                Filtrar por mês:
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedMonth === "" ? "default" : "outline"}
                  onClick={() => setSelectedMonth("")}
                  size="sm"
                  className={variant === "student" ? (selectedMonth === "" ? styles.buttonSecondaryActive : styles.buttonSecondaryInactive) : ""}
                >
                  Todos
                </Button>
                {mesesDisponiveis.map(mes => (
                  <Button
                    key={mes}
                    variant={selectedMonth === mes ? "default" : "outline"}
                    onClick={() => setSelectedMonth(mes)}
                    size="sm"
                    className={variant === "student" ? (selectedMonth === mes ? styles.buttonSecondaryActive : styles.buttonSecondaryInactive) : ""}
                  >
                    {mes}
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
                  className={styles.rankingItem}
                >
                  <div className="flex items-center gap-4">
                    {getPosicaoIcon(item.posicao)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={styles.rankingPosition}>
                          {item.posicao}º lugar
                        </span>
                      </div>
                      <div className={styles.rankingName}>
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
                    <div className={styles.rankingScore}>
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
    </div>
  );
};