
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Filter, Users, FileText, Bell, UserCheck } from "lucide-react";
import { AjudaRapidaAdminCard } from "@/components/ajuda-rapida/AjudaRapidaAdminCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, setMonth, setYear } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface DashboardMetrics {
  totalAlunos: number;
  redacoesEnviadas: number;
  avisosAtivos: number;
  corretoresAtivos: number;
}

const TURMAS = ['Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E', 'Visitante'];

export const Dashboard = () => {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalAlunos: 0,
    redacoesEnviadas: 0,
    avisosAtivos: 0,
    corretoresAtivos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [selectedMonth, selectedYear, selectedTurma]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Calcular janela mensal em timezone Fortaleza
      const baseDate = toZonedTime(new Date(selectedYear, selectedMonth - 1, 1), 'America/Fortaleza');
      const monthStart = startOfMonth(baseDate);
      const monthEnd = endOfMonth(baseDate);

      // Total de alunos ativos
      let alunosQuery = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('user_type', 'aluno')
        .eq('ativo', true);

      if (selectedTurma) {
        if (selectedTurma === 'Visitante') {
          // Para visitantes, contar sessões ativas da tabela visitante_sessoes
          const { count: visitantesCount } = await supabase
            .from('visitante_sessoes')
            .select('id', { count: 'exact', head: true })
            .eq('ativo', true);
          setMetrics(prev => ({ ...prev, totalAlunos: visitantesCount || 0 }));
        } else {
          alunosQuery = alunosQuery.eq('turma', selectedTurma);
        }
      }

      const { count: totalAlunos } = await alunosQuery;

      // Redações enviadas no período (Regular + Simulado + Exercício)
      const redacoesPromises = [
        // Redações regulares
        supabase
          .from('redacoes_enviadas')
          .select('id', { count: 'exact', head: true })
          .gte('data_envio', monthStart.toISOString())
          .lt('data_envio', monthEnd.toISOString())
          .neq('status', 'devolvida'),
        
        // Redações de simulado
        supabase
          .from('redacoes_simulado')
          .select('id', { count: 'exact', head: true })
          .gte('data_envio', monthStart.toISOString())
          .lt('data_envio', monthEnd.toISOString())
          .is('devolvida_por', null),
        
        // Redações de exercício
        supabase
          .from('redacoes_exercicio')
          .select('id', { count: 'exact', head: true })
          .gte('data_envio', monthStart.toISOString())
          .lt('data_envio', monthEnd.toISOString())
          .is('devolvida_por', null)
      ];

      if (selectedTurma) {
        redacoesPromises.forEach(promise => {
          if (selectedTurma === 'Visitante') {
            promise.eq('turma', 'visitante');
          } else {
            promise.eq('turma', selectedTurma);
          }
        });
      }

      const [
        { count: redacoesRegulares },
        { count: redacoesSimulado },
        { count: redacoesExercicio }
      ] = await Promise.all(redacoesPromises);

      const redacoesEnviadas = (redacoesRegulares || 0) + (redacoesSimulado || 0) + (redacoesExercicio || 0);

      // Avisos ativos
      const { count: avisosAtivos } = await supabase
        .from('avisos')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'publicado')
        .eq('ativo', true);

      // Corretores ativos
      const { count: corretoresAtivos } = await supabase
        .from('corretores')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true);

      setMetrics({
        totalAlunos: totalAlunos || 0,
        redacoesEnviadas,
        avisosAtivos: avisosAtivos || 0,
        corretoresAtivos: corretoresAtivos || 0
      });

    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Card Ajuda Rápida */}
      <AjudaRapidaAdminCard />
      
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 12}, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {getMonthName(i + 1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 5}, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Turma (Opcional)</label>
              <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as turmas</SelectItem>
                  {TURMAS.map((turma) => (
                    <SelectItem key={turma} value={turma}>
                      {turma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Período: {getMonthName(selectedMonth)} {selectedYear}
            {selectedTurma && ` • Turma: ${selectedTurma}`}
          </div>
        </CardContent>
      </Card>
      
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : metrics.totalAlunos}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedTurma ? `Turma ${selectedTurma}` : "Todas as turmas"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redações Enviadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : metrics.redacoesEnviadas}
            </div>
            <p className="text-xs text-muted-foreground">
              {getMonthName(selectedMonth)} {selectedYear}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avisos Ativos</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : metrics.avisosAtivos}
            </div>
            <p className="text-xs text-muted-foreground">
              Publicados e ativos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corretores Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : metrics.corretoresAtivos}
            </div>
            <p className="text-xs text-muted-foreground">
              Disponíveis para correção
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
