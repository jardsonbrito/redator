import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronDown, ChevronUp, Calendar, Clock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoginRecord {
  student_email: string;
  student_name: string;
  turma: string;
  last_login_at: string;
  session_duration_seconds: number;
  formatted_duration: string;
  total_sessions: number;
  is_online?: boolean;
}

interface DayLoginData {
  date: string;
  dayOfWeek: string;
  formattedDate: string;
  logins: LoginRecord[];
}

export const LoginDashboardTab = () => {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Buscar dados de login dos últimos 7 dias
  const { data: loginData, isLoading } = useQuery({
    queryKey: ['all-students-login-last-7-days'],
    queryFn: async (): Promise<DayLoginData[]> => {
      console.log('🔍 Buscando dados de login dos últimos 7 dias...');

      // Buscar dados dos alunos primeiro
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('email, nome, turma')
        .eq('user_type', 'aluno');

      if (studentsError) {
        console.error('❌ Erro ao buscar alunos:', studentsError);
        return [];
      }

      console.log(`👥 ${students?.length || 0} alunos encontrados`);

      // Gerar os últimos 7 dias no horário de Brasília (UTC-3)
      const days: DayLoginData[] = [];
      const now = new Date();

      for (let i = 0; i < 7; i++) {
        // Criar data no horário de Brasília
        const brasiliaDateStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
        const brasiliaDate = new Date(brasiliaDateStr);
        brasiliaDate.setDate(brasiliaDate.getDate() - i);
        brasiliaDate.setHours(0, 0, 0, 0);

        // Extrair componentes da data
        const year = brasiliaDate.getFullYear();
        const month = String(brasiliaDate.getMonth() + 1).padStart(2, '0');
        const day = String(brasiliaDate.getDate()).padStart(2, '0');

        const dateString = `${year}-${month}-${day}`;

        // Formatar dia da semana e data
        const dayOfWeek = brasiliaDate.toLocaleDateString('pt-BR', {
          weekday: 'long',
          timeZone: 'America/Sao_Paulo'
        });

        const formattedDate = `${day}/${month}/${year}`;

        days.push({
          date: dateString,
          dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
          formattedDate: formattedDate,
          logins: []
        });
      }

      // Para cada aluno, buscar atividades dos últimos 7 dias
      const allActivities: Map<string, any[]> = new Map();

      for (const student of students || []) {
        try {
          // Tentar função híbrida primeiro
          let { data: activities, error } = await supabase.rpc('get_student_activity_hybrid', {
            p_student_email: student.email,
            p_days_limit: 7
          });

          // Se não existir, tentar função antiga
          if (error?.message?.includes('does not exist') || error?.message?.includes('function')) {
            const fallback = await supabase.rpc('get_student_activity', {
              p_student_email: student.email,
              p_days_limit: 7
            });

            if (!fallback.error) {
              activities = fallback.data;
            }
          }

          if (activities && activities.length > 0) {
            allActivities.set(student.email, activities.map((act: any) => ({
              ...act,
              student_name: student.nome,
              turma: student.turma || 'Sem turma'
            })));
          }
        } catch (err) {
          console.warn(`⚠️ Erro ao buscar atividade de ${student.email}:`, err);
        }
      }

      console.log(`📊 Atividades encontradas para ${allActivities.size} alunos`);

      // Organizar atividades por dia (convertendo UTC para horário de Brasília)
      for (const day of days) {
        const dayLogins: LoginRecord[] = [];

        for (const [email, activities] of allActivities.entries()) {
          const dayActivity = activities.find((act: any) => {
            // A reference_date já vem como string "YYYY-MM-DD" - apenas comparar
            const actDateStr = act.reference_date.split('T')[0]; // Garantir formato YYYY-MM-DD
            return actDateStr === day.date;
          });

          if (dayActivity && dayActivity.last_login_at) {
            // Verificar se o aluno está REALMENTE online agora
            const lastLoginTime = new Date(dayActivity.last_login_at).getTime();
            const now = new Date().getTime();
            const minutesSinceLogin = (now - lastLoginTime) / (1000 * 60);

            // Considerar online apenas se:
            // 1. A duração é 0 (sessão ainda não encerrada) E
            // 2. O login foi há menos de 5 minutos (para evitar dados desatualizados)
            const isOnline = (dayActivity.session_duration_seconds || 0) === 0 && minutesSinceLogin <= 5;

            dayLogins.push({
              student_email: email,
              student_name: dayActivity.student_name,
              turma: dayActivity.turma,
              last_login_at: dayActivity.last_login_at,
              session_duration_seconds: dayActivity.session_duration_seconds || 0,
              formatted_duration: formatDuration(dayActivity.session_duration_seconds || 0),
              total_sessions: dayActivity.total_sessions || 1,
              is_online: isOnline
            });
          }
        }

        // Ordenar por nome
        dayLogins.sort((a, b) => a.student_name.localeCompare(b.student_name));
        day.logins = dayLogins;
      }

      const nowBrasiliaStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      console.log(`🕐 Data/Hora atual em Brasília: ${nowBrasiliaStr}`);
      console.log(`✅ Dados carregados: ${days.length} dias`);
      days.forEach(day => {
        console.log(`  ${day.dayOfWeek} ${day.formattedDate}: ${day.logins.length} logins`);
      });

      return days;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 10000,
  });

  // Função auxiliar para formatar duração
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds < 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2">Histórico de Login - Últimos 7 Dias</h2>
        <p className="text-muted-foreground">
          Clique em cada dia para ver a lista de alunos que fizeram login
        </p>
      </div>

      {loginData?.map((day) => (
        <Card key={day.date} className="overflow-hidden">
          <CardHeader
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleDay(day.date)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">
                    {day.dayOfWeek} – {day.formattedDate}
                  </CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={day.logins.length > 0 ? "default" : "secondary"}>
                  {day.logins.length} {day.logins.length === 1 ? 'aluno' : 'alunos'}
                </Badge>
                {expandedDays.has(day.date) ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>

          {expandedDays.has(day.date) && (
            <CardContent className="pt-0">
              {day.logins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum login registrado neste dia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {day.logins.map((login, index) => (
                    <div
                      key={`${login.student_email}-${index}`}
                      className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{login.student_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {login.turma}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <LogIn className="w-3 h-3" />
                              <span>Horário: {formatTime(login.last_login_at)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {login.is_online ? (
                                <span className="text-green-600 font-semibold flex items-center gap-1">
                                  🟢 Online agora
                                </span>
                              ) : (
                                <span>Tempo logado: {login.formatted_duration}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <LogIn className="w-3 h-3" />
                              <span>{login.total_sessions} sessão{login.total_sessions !== 1 ? 'ões' : ''}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};
