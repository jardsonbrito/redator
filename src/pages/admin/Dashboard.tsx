
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Filter, Users, FileText, Bell, UserCheck, Award, BookOpen } from "lucide-react";
import { AjudaRapidaAdminCard } from "@/components/ajuda-rapida/AjudaRapidaAdminCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, setMonth, setYear } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminPageTitle } from "@/hooks/useAdminNavigationContext";
import { useQuery } from "@tanstack/react-query";
import { DashboardCardSkeleton } from "@/components/admin/DashboardCardSkeleton";
import { DetailedDashboardCard } from "@/components/admin/DetailedDashboardCard";

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

  // Configurar título da página
  useAdminPageTitle('Dashboard');

  // Memoizar o período para evitar recálculo desnecessário
  const dateRange = useMemo(() => {
    const baseDate = toZonedTime(new Date(selectedYear, selectedMonth - 1, 1), 'America/Fortaleza');
    return {
      start: startOfMonth(baseDate).toISOString(),
      end: endOfMonth(baseDate).toISOString()
    };
  }, [selectedMonth, selectedYear]);

  // Hook para total de alunos com cache
  const { data: totalAlunos = 0, isLoading: isLoadingAlunos } = useQuery({
    queryKey: ['dashboard-alunos', selectedTurma],
    queryFn: async () => {
      if (selectedTurma === 'Visitante') {
        const { count } = await supabase
          .from('visitante_sessoes')
          .select('id', { count: 'exact', head: true })
          .eq('ativo', true);
        return count || 0;
      }

      let query = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('user_type', 'aluno')
        .eq('ativo', true);

      if (selectedTurma) {
        query = query.eq('turma', selectedTurma);
      }

      const { count } = await query;
      return count || 0;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000 // 5 minutos
  });

  // Hook para redações enviadas com cache
  const { data: redacoesEnviadas = 0, isLoading: isLoadingRedacoes } = useQuery({
    queryKey: ['dashboard-redacoes', dateRange, selectedTurma],
    queryFn: async () => {
      const promises = [
        // Redações regulares
        supabase
          .from('redacoes_enviadas')
          .select('id', { count: 'exact', head: true })
          .gte('data_envio', dateRange.start)
          .lt('data_envio', dateRange.end)
          .neq('status', 'devolvida'),

        // Redações de simulado
        supabase
          .from('redacoes_simulado')
          .select('id', { count: 'exact', head: true })
          .gte('data_envio', dateRange.start)
          .lt('data_envio', dateRange.end)
          .is('devolvida_por', null),

        // Redações de exercício
        supabase
          .from('redacoes_exercicio')
          .select('id', { count: 'exact', head: true })
          .gte('data_envio', dateRange.start)
          .lt('data_envio', dateRange.end)
          .is('devolvida_por', null)
      ];

      // Aplicar filtro de turma se necessário
      if (selectedTurma) {
        const turmaValue = selectedTurma === 'Visitante' ? 'visitante' : selectedTurma;
        promises.forEach(promise => promise.eq('turma', turmaValue));
      }

      const results = await Promise.all(promises);
      const total = results.reduce((sum, { count }) => sum + (count || 0), 0);
      return total;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });

  // Hook para avisos ativos (dados mais estáticos)
  const { data: avisosAtivos = 0, isLoading: isLoadingAvisos } = useQuery({
    queryKey: ['dashboard-avisos'],
    queryFn: async () => {
      const { count } = await supabase
        .from('avisos')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'publicado')
        .eq('ativo', true);
      return count || 0;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos para dados mais estáticos
    gcTime: 10 * 60 * 1000
  });

  // Hook para corretores ativos (dados mais estáticos)
  const { data: corretoresAtivos = 0, isLoading: isLoadingCorretores } = useQuery({
    queryKey: ['dashboard-corretores'],
    queryFn: async () => {
      const { count } = await supabase
        .from('corretores')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true);
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // Hook para dados de temas
  const { data: temas } = useQuery({
    queryKey: ['dashboard-temas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('temas')
        .select('id, data_publicacao, data_agendamento')
        .eq('ativo', true);

      const now = new Date();
      const publicados = data?.filter(t =>
        !t.data_agendamento || new Date(t.data_agendamento) <= now
      ).length || 0;

      const programados = data?.filter(t =>
        t.data_agendamento && new Date(t.data_agendamento) > now
      ).length || 0;

      return { publicados, programados };
    },
    staleTime: 2 * 60 * 1000
  });

  // Hook para redações exemplares
  const { data: redacoesExemplares } = useQuery({
    queryKey: ['dashboard-redacoes-exemplares'],
    queryFn: async () => {
      const { data } = await supabase
        .from('redacoes')
        .select('id, data_agendamento')
        .eq('nota_total', 1000);

      const now = new Date();
      const publicadas = data?.filter(r =>
        !r.data_agendamento || new Date(r.data_agendamento) <= now
      ).length || 0;

      const programadas = data?.filter(r =>
        r.data_agendamento && new Date(r.data_agendamento) > now
      ).length || 0;

      return { publicadas, programadas };
    },
    staleTime: 2 * 60 * 1000
  });

  // Hook para redações pendentes de correção
  const { data: redacoesPendentes } = useQuery({
    queryKey: ['dashboard-redacoes-pendentes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('redacoes_enviadas')
        .select('id, corretor_id_1, corretores!redacoes_enviadas_corretor_id_1_fkey(nome)')
        .in('status', ['aguardando', 'em_correcao'])
        .eq('corrigida', false);

      const pendentes = data?.length || 0;

      // Contar por corretor
      const porCorretor = data?.reduce((acc: any, r: any) => {
        if (r.corretores?.nome) {
          acc[r.corretores.nome] = (acc[r.corretores.nome] || 0) + 1;
        }
        return acc;
      }, {});

      return {
        pendentes,
        porCorretor: Object.entries(porCorretor || {})
          .map(([nome, count]) => `${nome}: ${count}`)
          .join(', ')
      };
    },
    staleTime: 1 * 60 * 1000
  });

  // Hook para turmas ativas
  const { data: turmasAtivas = 0 } = useQuery({
    queryKey: ['dashboard-turmas'],
    queryFn: async () => {
      const { count } = await supabase
        .from('turmas')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true);
      return count || 0;
    },
    staleTime: 5 * 60 * 1000
  });

  // Hook para aulas gravadas
  const { data: aulasGravadas = 0 } = useQuery({
    queryKey: ['dashboard-aulas'],
    queryFn: async () => {
      const { count } = await supabase
        .from('aulas')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true);
      return count || 0;
    },
    staleTime: 5 * 60 * 1000
  });


  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  return (
    <AdminLayout>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {isLoadingAlunos ? (
          <DashboardCardSkeleton icon={<Users className="h-4 w-4 text-muted-foreground" />} />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalAlunos.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedTurma ? `Turma ${selectedTurma}` : "Todas as turmas"}
              </p>
            </CardContent>
          </Card>
        )}

        {isLoadingRedacoes ? (
          <DashboardCardSkeleton icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Redações Enviadas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {redacoesEnviadas.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground">
                {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </CardContent>
          </Card>
        )}
        {isLoadingAvisos ? (
          <DashboardCardSkeleton icon={<Bell className="h-4 w-4 text-muted-foreground" />} />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avisos Ativos</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avisosAtivos.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground">
                Publicados e ativos
              </p>
            </CardContent>
          </Card>
        )}

        {isLoadingCorretores ? (
          <DashboardCardSkeleton icon={<UserCheck className="h-4 w-4 text-muted-foreground" />} />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Corretores Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {corretoresAtivos.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground">
                Disponíveis para correção
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dashboard Detalhado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Card Temas */}
        <DetailedDashboardCard
          title="Temas"
          icon="📝"
          primaryInfo={`${temas?.publicados || 0} publicados`}
          secondaryInfo={temas?.programados ? `${temas.programados} programados` : undefined}
          description="Temas disponíveis para redação"
          variant="primary"
        />

        {/* Card Redações Exemplares */}
        <DetailedDashboardCard
          title="Redações Exemplares"
          icon="⭐"
          primaryInfo={`${redacoesExemplares?.publicadas || 0} publicadas`}
          secondaryInfo={redacoesExemplares?.programadas ? `${redacoesExemplares.programadas} programadas` : undefined}
          description="Redações modelo para estudos"
          variant="success"
        />

        {/* Card Redações Enviadas */}
        <DetailedDashboardCard
          title="Redações Enviadas"
          icon="📄"
          primaryInfo={`${redacoesPendentes?.pendentes || 0} pendentes`}
          secondaryInfo={redacoesPendentes?.porCorretor || undefined}
          description="Redações aguardando correção"
          variant={redacoesPendentes?.pendentes ? "warning" : "default"}
        />

        {/* Card Diário Online */}
        <DetailedDashboardCard
          title="Diário Online"
          icon="📚"
          primaryInfo={`${turmasAtivas} turmas`}
          secondaryInfo="Sistema ativo"
          description="Controle de presença e etapas"
        />

        {/* Card Exercícios */}
        <DetailedDashboardCard
          title="Exercícios"
          icon="✏️"
          primaryInfo="4 ativos"
          secondaryInfo="Turmas A, B, C"
          description="Exercícios em andamento"
        />

        {/* Card Simulados */}
        <DetailedDashboardCard
          title="Simulados"
          icon="🎯"
          primaryInfo="Próximo: 28/09"
          secondaryInfo="Turma A"
          description="Simulados agendados"
        />

        {/* Card Lousa */}
        <DetailedDashboardCard
          title="Lousa"
          icon="📋"
          primaryInfo="2 pendentes"
          secondaryInfo="Turma B"
          description="Respostas para correção"
        />

        {/* Card Aula ao Vivo */}
        <DetailedDashboardCard
          title="Aula ao Vivo"
          icon="🎥"
          primaryInfo="Próxima: 25/09"
          secondaryInfo="Turma C - 19h"
          description="Aulas programadas"
        />

        {/* Card Aulas Gravadas */}
        <DetailedDashboardCard
          title="Aulas Gravadas"
          icon="📹"
          primaryInfo={`${aulasGravadas} disponíveis`}
          secondaryInfo="Biblioteca ativa"
          description="Conteúdo gravado"
        />

        {/* Card Biblioteca */}
        <DetailedDashboardCard
          title="Biblioteca"
          icon="🎬"
          primaryInfo="120 vídeos"
          secondaryInfo="5 programados, 30 arquivos"
          description="Conteúdo de apoio"
        />

        {/* Card Mural de Avisos */}
        <DetailedDashboardCard
          title="Mural de Avisos"
          icon="📢"
          primaryInfo={`${avisosAtivos} ativos`}
          secondaryInfo="Publicados e visíveis"
          description="Avisos em vigor"
        />

        {/* Card Radar */}
        <DetailedDashboardCard
          title="Radar"
          icon="🎯"
          primaryInfo="-"
          secondaryInfo="-"
          description="Em desenvolvimento"
        />

        {/* Card Gamificação */}
        <DetailedDashboardCard
          title="Gamificação"
          icon="🎮"
          primaryInfo="3 jogos"
          secondaryInfo="Disponíveis"
          description="Jogos educativos"
        />

        {/* Card Ajuda Rápida */}
        <DetailedDashboardCard
          title="Ajuda Rápida"
          icon="💬"
          primaryInfo="2 não respondidas"
          secondaryInfo="Prof. Ana deve responder"
          description="Perguntas dos alunos"
        />

        {/* Card Alunos */}
        <DetailedDashboardCard
          title="Alunos"
          icon="👥"
          primaryInfo={`${totalAlunos} ${selectedTurma ? 'na turma' : 'ativos'}`}
          secondaryInfo={selectedTurma ? `Turma ${selectedTurma}` : "Todas as turmas"}
          description="Cadastro de estudantes"
          variant="secondary"
        />

        {/* Card Corretores */}
        <DetailedDashboardCard
          title="Corretores"
          icon="✅"
          primaryInfo={`${corretoresAtivos} disponíveis`}
          secondaryInfo="Equipe ativa"
          description="Equipe de correção"
        />

        {/* Cards em branco */}
        <DetailedDashboardCard
          title="Professores"
          icon="👨‍🏫"
          primaryInfo="-"
          secondaryInfo="-"
          description="Gestão de professores"
        />

        <DetailedDashboardCard
          title="Administradores"
          icon="⚙️"
          primaryInfo="-"
          secondaryInfo="-"
          description="Controle de acesso"
        />

        <DetailedDashboardCard
          title="Exportação"
          icon="📊"
          primaryInfo="-"
          secondaryInfo="-"
          description="Relatórios e dados"
        />

        <DetailedDashboardCard
          title="Configuração"
          icon="🔧"
          primaryInfo="-"
          secondaryInfo="-"
          description="Configurações do sistema"
        />

        <DetailedDashboardCard
          title="Top 5"
          icon="🏆"
          primaryInfo="-"
          secondaryInfo="-"
          description="Rankings e premiações"
        />
      </div>
      </div>
    </AdminLayout>
  );
};
