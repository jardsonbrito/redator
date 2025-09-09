import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useAuth } from "@/hooks/useAuth";

// Função para extrair a letra da turma 
const extractTurmaLetter = (turma: string | null | undefined): string => {
  if (!turma) return 'N/A';
  
  // Formato 1: "LRA2025", "LRB2025", etc.
  const match1 = turma.match(/LR([A-Z])20\d{2}/);
  if (match1) return match1[1];
  
  // Formato 2: "Turma A", "Turma B", etc.
  const match2 = turma.match(/Turma ([A-Z])/);
  if (match2) return match2[1];
  
  // Formato 3: Apenas a letra "A", "B", etc.
  if (turma.length === 1 && /[A-Z]/.test(turma)) return turma;
  
  return 'N/A';
};

// Função para obter as cores da turma
const getTurmaColors = (turmaLetter: string) => {
  const colors = {
    'A': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    'B': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    'C': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    'D': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    'E': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    'N/A': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
  };
  
  return colors[turmaLetter] || colors['N/A'];
};

interface Top5WidgetProps {
  showHeader?: boolean;
  variant?: "student" | "corretor" | "admin";
  turmaFilter?: string; // Para casos onde queremos forçar uma turma específica
}

export const Top5Widget = ({ showHeader = true, variant = "student", turmaFilter }: Top5WidgetProps) => {
  const [selectedType, setSelectedType] = useState<"simulado" | "regular" | "avulsa">("simulado");
  const [selectedSimulado, setSelectedSimulado] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedTurmaAdmin, setSelectedTurmaAdmin] = useState<string>("geral");
  
  // Hooks de autenticação
  const { studentData } = useStudentAuth();
  const { user: adminUser } = useAuth();
  
  // Determinar turma ativa para filtros - diferentes formatos por tabela
  const getTurmaForTable = (letra: string, tabela: string) => {
    if (tabela === 'redacoes_simulado') {
      return `Turma ${letra}`;
    } else {
      return `LR${letra}2025`;
    }
  };
  
  const turmaAtivaLetter = variant === "admin" && selectedTurmaAdmin !== "geral" ? selectedTurmaAdmin : null;

  // Buscar notas 1000 para "Galeria de Honra" (sempre global, mas filtra por mês)
  const { data: galeria1000 } = useQuery({
    queryKey: ['galeria-honra-1000', selectedMonth],
    queryFn: async () => {
      // Buscar nas três tabelas: redacoes_enviadas, redacoes_simulado, redacoes_exercicio
      const [enviadasRes, simuladoRes, exercicioRes] = await Promise.all([
        supabase
          .from('redacoes_enviadas')
          .select('nome_aluno, nota_total, data_envio, email_aluno, turma')
          .eq('nota_total', 1000)
          .order('data_envio', { ascending: false }),
        supabase
          .from('redacoes_simulado')
          .select('nome_aluno, nota_total, data_envio, email_aluno, turma')
          .eq('nota_total', 1000)
          .order('data_envio', { ascending: false }),
        supabase
          .from('redacoes_exercicio')
          .select('nome_aluno, nota_total, data_envio, email_aluno, turma')
          .eq('nota_total', 1000)
          .order('data_envio', { ascending: false })
      ]);

      const todasNotas1000 = [
        ...(enviadasRes.data || []),
        ...(simuladoRes.data || []),
        ...(exercicioRes.data || [])
      ];

      if (todasNotas1000.length === 0) return null;

      // A turma já vem diretamente das queries acima
      let notasComTurma = todasNotas1000;
      
      // Filtrar por mês se selecionado
      if (selectedMonth) {
        notasComTurma = notasComTurma.filter(nota => {
          const dataRedacao = new Date(nota.data_envio);
          const mesRedacao = dataRedacao.toLocaleDateString('pt-BR', { 
            month: 'long', 
            year: 'numeric' 
          });
          const mesCapitalizado = mesRedacao.charAt(0).toUpperCase() + mesRedacao.slice(1);
          return mesCapitalizado === selectedMonth;
        });
      }
      
      // Agrupar por aluno (só a mais recente de cada)
      const alunosUnicos = new Map();
      notasComTurma.forEach(nota => {
        if (!alunosUnicos.has(nota.nome_aluno) || 
            new Date(nota.data_envio) > new Date(alunosUnicos.get(nota.nome_aluno).data_envio)) {
          alunosUnicos.set(nota.nome_aluno, nota);
        }
      });
      
      return {
        total: alunosUnicos.size,
        alunos: Array.from(alunosUnicos.values()).sort((a, b) => 
          new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime()
        )
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
    queryKey: ['ranking', selectedType, selectedSimulado, selectedMonth, turmaAtivaLetter],
    queryFn: async () => {
      let processedData = [];
      
      // Não precisamos mais buscar emails separadamente pois todas as tabelas têm o campo turma
      
      if (selectedType === "simulado") {
        // Para simulados, buscar dados diretamente da tabela redacoes_simulado
        let query = supabase
          .from('redacoes_simulado')
          .select(`
            nome_aluno, 
            email_aluno, 
            nota_total, 
            data_envio,
            turma,
            simulados(titulo)
          `)
          .not('nota_total', 'is', null)
          .eq('corrigida', true);
        
        // Filtrar por turma se necessário
        if (turmaAtivaLetter) {
          const turmaForSimulado = getTurmaForTable(turmaAtivaLetter, 'redacoes_simulado');
          query = query.eq('turma', turmaForSimulado);
        }
        
        const { data, error } = await query.order('nota_total', { ascending: false });
        
        if (error) throw error;
        
        let filteredData = data || [];
        
        // Filtrar por simulado específico se selecionado
        if (selectedSimulado && simulados) {
          const simuladoSelecionado = simulados.find(s => s.id === selectedSimulado);
          if (simuladoSelecionado) {
            filteredData = filteredData.filter(item => 
              item.simulados?.titulo === simuladoSelecionado.titulo
            );
          }
        }
        
        // Transformar dados para formato esperado
        processedData = filteredData.map(item => ({
          nome_aluno: item.nome_aluno,
          nota_total: Number(item.nota_total),
          simulados: item.simulados,
          email_aluno: item.email_aluno,
          data_envio: item.data_envio,
          turma: item.turma
        }));
      } else {
        // Para regular e avulsa, usar redacoes_enviadas
        let query = supabase
          .from('redacoes_enviadas')
          .select('nome_aluno, nota_total, tipo_envio, data_envio, email_aluno, turma')
          .not('nota_total', 'is', null)
          .eq('corrigida', true);
          
        if (selectedType === "regular") {
          query = query.eq('tipo_envio', 'regular');
        } else if (selectedType === "avulsa") {
          query = query.eq('tipo_envio', 'avulsa');
        }
        
        // Filtrar por turma se necessário
        if (turmaAtivaLetter) {
          const turmaForEnviadas = getTurmaForTable(turmaAtivaLetter, 'redacoes_enviadas');
          query = query.eq('turma', turmaForEnviadas);
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
        
        // Transformar dados para incluir turma
        processedData = filteredData.map(item => ({
          ...item,
          turma: item.turma
        }));
      }
      
      // Agora todas as queries já incluem o campo turma diretamente
      let processedDataComplete = processedData;
      
      // Agrupar por aluno, mantendo apenas a maior nota de cada um
      const melhoresNotasPorAluno = new Map();
      processedDataComplete.forEach(item => {
        const nomeAluno = item.nome_aluno;
        const notaAtual = selectedType === "simulado" ? Number(item.nota_total) : Number(item.nota_total);
        
        if (!melhoresNotasPorAluno.has(nomeAluno)) {
          melhoresNotasPorAluno.set(nomeAluno, item);
        } else {
          const itemExistente = melhoresNotasPorAluno.get(nomeAluno);
          const notaExistente = selectedType === "simulado" ? Number(itemExistente.nota_total) : Number(itemExistente.nota_total);
          
          // Se a nota atual é maior, ou igual mas mais recente, substituir
          if (notaAtual > notaExistente || 
              (notaAtual === notaExistente && 
               new Date(item.data_envio).getTime() > new Date(itemExistente.data_envio).getTime())) {
            melhoresNotasPorAluno.set(nomeAluno, item);
          }
        }
      });
      
      // Converter para array e ordenar
      const dadosOrdenados = Array.from(melhoresNotasPorAluno.values()).sort((a, b) => {
        const notaA = selectedType === "simulado" ? Number(a.nota_total) : Number(a.nota_total);
        const notaB = selectedType === "simulado" ? Number(b.nota_total) : Number(b.nota_total);
        
        // 1º critério: nota (descendente)
        if (notaB !== notaA) {
          return notaB - notaA;
        }
        
        // 2º critério: data (mais recente primeiro)
        const dataA = new Date(a.data_envio).getTime();
        const dataB = new Date(b.data_envio).getTime();
        if (dataB !== dataA) {
          return dataB - dataA;
        }
        
        // 3º critério: alfabético
        return a.nome_aluno.localeCompare(b.nome_aluno);
      });
      
      // Processar ranking com lógica de empates justos
      const rankingComPosicao: Array<{
        posicao: number;
        nome_aluno: string;
        nota_total: number;
        simulado_titulo?: string;
        data_envio?: string;
        turma?: string;
      }> = [];
      
      // Obter as 5 notas distintas mais altas
      const notasUnicas = [...new Set(dadosOrdenados.map(item => 
        selectedType === "simulado" ? Number(item.nota_total) : Number(item.nota_total)
      ))].sort((a, b) => Number(b) - Number(a));
      const top5Notas = notasUnicas.slice(0, 5);
      
      // Para cada uma das 5 notas mais altas, incluir TODOS os alunos com essa nota
      top5Notas.forEach((nota, index) => {
        const alunosComEssaNota = dadosOrdenados.filter(item => 
          (selectedType === "simulado" ? Number(item.nota_total) : Number(item.nota_total)) === nota
        );
        const posicao = index + 1;
        
        // Ordenar alunos com mesma nota por data (mais recente) e depois alfabético
        const alunosOrdenados = alunosComEssaNota.sort((a, b) => {
          const dataA = new Date(a.data_envio).getTime();
          const dataB = new Date(b.data_envio).getTime();
          if (dataB !== dataA) {
            return dataB - dataA;
          }
          return a.nome_aluno.localeCompare(b.nome_aluno);
        });
        
        alunosOrdenados.forEach(aluno => {
          rankingComPosicao.push({
            posicao: posicao,
            nome_aluno: aluno.nome_aluno,
            nota_total: selectedType === "simulado" ? Number(aluno.nota_total) : Number(aluno.nota_total),
            simulado_titulo: aluno.simulados?.titulo,
            data_envio: aluno.data_envio,
            turma: aluno.turma
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
      {/* Galeria de Honra - 1000 pontos */}
      {galeria1000 && galeria1000.total > 0 && (
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
              <div className="flex-1">
                <CardTitle className={styles.majorNoteTitle}>
                  🏆 Galeria de Honra — 1000 pontos
                  {selectedMonth && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({selectedMonth})
                    </span>
                  )}
                </CardTitle>
                <div className="mt-2">
                  <span className={styles.majorNoteValue}>1000</span>
                  <span className="text-lg text-muted-foreground ml-2">pontos</span>
                  <span className="text-sm text-muted-foreground ml-3">
                    ({galeria1000.total} {galeria1000.total === 1 ? 'aluno' : 'alunos'})
                  </span>
                </div>
                <div className={`${styles.majorNoteNames} mt-2 space-y-1`}>
                  {galeria1000.alunos.slice(0, 5).map((aluno, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>
                        {aluno.nome_aluno}
                        {variant === "admin" && aluno.turma && (
                          (() => {
                            const turmaLetter = extractTurmaLetter(aluno.turma);
                            const colors = getTurmaColors(turmaLetter);
                            return (
                              <span className={`ml-2 px-2 py-1 ${colors.bg} ${colors.text} ${colors.border} border text-xs rounded font-medium`}>
                                Turma {turmaLetter}
                              </span>
                            );
                          })()
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(aluno.data_envio).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                  {galeria1000.total > 5 && (
                    <div className="text-sm text-muted-foreground">
                      ... e mais {galeria1000.total - 5} {galeria1000.total - 5 === 1 ? 'aluno' : 'alunos'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
      
      {/* Fallback quando não há notas 1000 */}
      {(!galeria1000 || galeria1000.total === 0) && (
        <Card className={styles.majorNoteCard}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="relative">
                {variant === "student" && (
                  <div className={styles.majorNoteIcon}></div>
                )}
                <div className={styles.majorNoteIconBg}>
                  <Crown className="w-8 h-8 text-white opacity-50" />
                </div>
              </div>
              <div>
                <CardTitle className={styles.majorNoteTitle}>
                  🏆 Galeria de Honra — 1000 pontos
                  {selectedMonth && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({selectedMonth})
                    </span>
                  )}
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  {selectedMonth 
                    ? `Ainda não há alunos que alcançaram 1000 pontos em ${selectedMonth}.`
                    : "Ainda não há alunos que alcançaram a nota máxima de 1000 pontos."
                  }
                  <br />
                  <span className="text-sm">
                    {selectedMonth 
                      ? "Tente outros meses ou seja o primeiro neste período! 🎯"
                      : "Seja o primeiro a conquistar esse marco histórico! 🎯"
                    }
                  </span>
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
          
          {/* Seletor de Turma para Admin */}
          {variant === "admin" && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-medium mb-2 text-blue-700">
                Filtrar por turma:
              </label>
              <Select value={selectedTurmaAdmin} onValueChange={setSelectedTurmaAdmin}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral (Todas as turmas)</SelectItem>
                  <SelectItem value="A">Turma A</SelectItem>
                  <SelectItem value="B">Turma B</SelectItem>
                  <SelectItem value="C">Turma C</SelectItem>
                  <SelectItem value="D">Turma D</SelectItem>
                  <SelectItem value="E">Turma E</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-blue-600 mt-1">
                {selectedTurmaAdmin === "geral" 
                  ? "Exibindo ranking de todas as turmas" 
                  : `Exibindo apenas alunos da turma ${selectedTurmaAdmin}`
                }
              </div>
            </div>
          )}
          
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
                        {variant === "admin" && item.turma && (
                          (() => {
                            const turmaLetter = extractTurmaLetter(item.turma);
                            const colors = getTurmaColors(turmaLetter);
                            return (
                              <span className={`ml-2 px-2 py-1 ${colors.bg} ${colors.text} ${colors.border} border text-xs rounded font-medium`}>
                                Turma {turmaLetter}
                              </span>
                            );
                          })()
                        )}
                      </div>
                      {item.simulado_titulo && (
                        <div className="text-sm text-muted-foreground">
                          {item.simulado_titulo}
                        </div>
                      )}
                      {item.data_envio && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.data_envio).toLocaleDateString('pt-BR')}
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