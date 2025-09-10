import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Trophy, FileText, Video, Users, PenTool } from "lucide-react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StudentHeader } from "@/components/StudentHeader";
import { usePageTitle } from "@/hooks/useBreadcrumbs";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

interface MonthlyActivity {
  month: number;
  year: number;
  essays_regular: number;
  essays_simulado: number;
  lousas_concluidas: number;
  lives_participei: number;
  gravadas_assistidas: number;
}

// Função para classificar tipo de redação de forma consistente
function classificarTipo(redacao: any): 'regular' | 'simulado' {
  if (redacao.tipo) return redacao.tipo;
  if (redacao.tema?.is_simulado === true) return 'simulado';
  const str = `${redacao.tema?.categoria || ''} ${redacao.tema?.titulo || ''} ${redacao.frase_tematica || ''}`;
  return /simulado/i.test(str) ? 'simulado' : 'regular';
}

export const MinhasConquistas = () => {
  // Configurar título da página
  usePageTitle('Minhas Conquistas');
  
  const { studentData } = useStudentAuth();
  const { toast } = useToast();
  const [monthlyActivities, setMonthlyActivities] = useState<MonthlyActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentData.email) {
      loadAllMonthlyActivities();
    }
  }, [studentData.email]);

  const loadAllMonthlyActivities = async () => {
    if (!studentData.email) return;

    setLoading(true);
    try {
      const emailBusca = studentData.email.toLowerCase().trim();
      
      // Buscar todos os meses com atividades a partir de julho/2025
      const startYear = 2025;
      const startMonth = 7; // Julho
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      const activities: MonthlyActivity[] = [];
      
      // Gerar todos os meses desde julho/2025 até o mês atual
      for (let year = startYear; year <= currentYear; year++) {
        const monthStart = year === startYear ? startMonth : 1;
        const monthEnd = year === currentYear ? currentMonth : 12;
        
        for (let month = monthStart; month <= monthEnd; month++) {
          const monthActivity = await loadMonthlyActivity(emailBusca, month, year);
          
          // Só adicionar se houver alguma atividade no mês
          const hasActivity = monthActivity.essays_regular > 0 || 
                             monthActivity.essays_simulado > 0 || 
                             monthActivity.lousas_concluidas > 0 || 
                             monthActivity.lives_participei > 0 || 
                             monthActivity.gravadas_assistidas > 0;
          
          if (hasActivity) {
            activities.push({
              month,
              year,
              ...monthActivity
            });
          }
        }
      }
      
      // Ordenar por ano e mês (mais recente primeiro)
      activities.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      
      setMonthlyActivities(activities);
      
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar atividades",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyActivity = async (emailBusca: string, month: number, year: number) => {
    // Calcular janela mensal com timezone Fortaleza
    const baseDate = toZonedTime(new Date(year, month - 1, 1), 'America/Fortaleza');
    const monthStart = startOfMonth(baseDate);
    const monthEnd = endOfMonth(baseDate);

    // === BUSCAR REDAÇÕES ===
    const [redacoesRegulares, redacoesSimulado, redacoesExercicio] = await Promise.all([
      supabase.from('redacoes_enviadas')
        .select('id, data_envio, status')
        .eq('email_aluno', emailBusca)
        .gte('data_envio', monthStart.toISOString())
        .lt('data_envio', monthEnd.toISOString()),
      
      supabase.from('redacoes_simulado')
        .select('id, data_envio')
        .eq('email_aluno', emailBusca)
        .gte('data_envio', monthStart.toISOString())
        .lt('data_envio', monthEnd.toISOString())
        .is('devolvida_por', null),
        
      supabase.from('redacoes_exercicio')
        .select('id, data_envio')
        .eq('email_aluno', emailBusca)
        .gte('data_envio', monthStart.toISOString())
        .lt('data_envio', monthEnd.toISOString())
        .is('devolvida_por', null)
    ]);

    // === CONTAR REDAÇÕES ===
    const regularesFiltradas = (redacoesRegulares.data || []).filter(r => r.status !== 'devolvida');
    const regularCount = regularesFiltradas.length + (redacoesExercicio.data || []).length;
    const simuladoCount = (redacoesSimulado.data || []).length;

    // === OUTRAS ATIVIDADES ===
    
    // Buscar presença em aulas ao vivo
    const { data: presencaLive } = await supabase
      .from('presenca_aulas')
      .select('aula_id, entrada_at')
      .eq('email_aluno', emailBusca)
      .gte('entrada_at', monthStart.toISOString())
      .lt('entrada_at', monthEnd.toISOString())
      .not('entrada_at', 'is', null);

    const livesParticipadas = [...new Set((presencaLive || []).map(p => p.aula_id))].length;

    // Buscar lousas respondidas
    const { data: lousasRespondidas } = await supabase
      .from('lousa_resposta')
      .select('lousa_id, submitted_at')
      .eq('email_aluno', emailBusca)
      .gte('submitted_at', monthStart.toISOString())
      .lt('submitted_at', monthEnd.toISOString())
      .not('submitted_at', 'is', null);

    const lousasConcluidas = [...new Set((lousasRespondidas || []).map(l => l.lousa_id))].length;

    // Buscar aulas gravadas assistidas
    const { data: eventosGravadas } = await supabase
      .from('student_feature_event')
      .select('entity_id')
      .eq('student_email', emailBusca)
      .eq('feature', 'gravada')
      .eq('action', 'watched')
      .gte('occurred_at', monthStart.toISOString())
      .lt('occurred_at', monthEnd.toISOString());

    const gravadasAssistidas = [...new Set((eventosGravadas || []).map(e => e.entity_id))].length;

    return {
      essays_regular: regularCount,
      essays_simulado: simuladoCount,
      lousas_concluidas: lousasConcluidas,
      lives_participei: livesParticipadas,
      gravadas_assistidas: gravadasAssistidas
    };
  };

  const getMonthName = (month: number) => {
    return format(new Date(2024, month - 1, 1), 'MMMM', { locale: ptBR });
  };

  const MonthlyActivityCard = ({ activity }: { activity: MonthlyActivity }) => {
    const monthName = getMonthName(activity.month);
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    
    const getProgressValue = (value: number, max = 10) => Math.min((value / max) * 100, 100);
    
    return (
      <Card className="hover:shadow-lg transition-all duration-300 animate-fade-in bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Atividades de {capitalizedMonth} {activity.year}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Redações */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-blue-500" />
              Redações
            </div>
            
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <span className="text-sm">Regular</span>
                <span className="font-semibold text-blue-600">{activity.essays_regular}</span>
              </div>
              {activity.essays_regular > 0 && (
                <Progress value={getProgressValue(activity.essays_regular)} className="h-2 bg-blue-100" />
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Simulado</span>
                <span className="font-semibold text-green-600">{activity.essays_simulado}</span>
              </div>
              {activity.essays_simulado > 0 && (
                <Progress value={getProgressValue(activity.essays_simulado)} className="h-2 bg-green-100" />
              )}
            </div>
          </div>

          {/* Ao vivo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Video className="h-4 w-4 text-orange-500" />
              Ao vivo
            </div>
            
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <span className="text-sm">Participei</span>
                <span className="font-semibold text-orange-600">{activity.lives_participei}</span>
              </div>
              {activity.lives_participei > 0 && (
                <Progress value={getProgressValue(activity.lives_participei)} className="h-2 bg-orange-100" />
              )}
            </div>
          </div>

          {/* Gravadas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-red-500" />
              Gravadas
            </div>
            
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <span className="text-sm">Assistidas</span>
                <span className="font-semibold text-red-600">{activity.gravadas_assistidas}</span>
              </div>
              {activity.gravadas_assistidas > 0 && (
                <Progress value={getProgressValue(activity.gravadas_assistidas)} className="h-2 bg-red-100" />
              )}
            </div>
          </div>

          {/* Lousa */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <PenTool className="h-4 w-4 text-purple-500" />
              Lousa
            </div>
            
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <span className="text-sm">Concluídas</span>
                <span className="font-semibold text-purple-600">{activity.lousas_concluidas}</span>
              </div>
              {activity.lousas_concluidas > 0 && (
                <Progress value={getProgressValue(activity.lousas_concluidas)} className="h-2 bg-purple-100" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Minhas Conquistas" />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary mb-2 flex items-center justify-center gap-3">
                <Trophy className="h-8 w-8" />
                Minhas Conquistas
              </h1>
              <p className="text-muted-foreground">
                Acompanhe suas atividades mensais e conquistas
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({length: 4}).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-8 bg-muted rounded"></div>
                      <div className="h-2 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader pageTitle="Minhas Conquistas" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {monthlyActivities.length === 0 ? (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Nenhuma atividade ainda</h3>
                <p className="text-sm text-muted-foreground">
                  Suas conquistas aparecerão aqui conforme você participa das atividades.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {monthlyActivities.map((activity, index) => (
                <div key={`${activity.year}-${activity.month}`} style={{ animationDelay: `${index * 100}ms` }}>
                  <MonthlyActivityCard activity={activity} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MinhasConquistas;