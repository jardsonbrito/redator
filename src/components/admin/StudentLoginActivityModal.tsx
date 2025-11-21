import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Clock, Calendar, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface StudentLoginActivityModalProps {
  studentEmail: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DailyActivity {
  reference_date: string;
  had_essay: boolean;
  essays_count: number;
  last_login_at: string | null;
  session_duration_seconds: number;
  total_sessions: number;
  formatted_duration: string;
  is_today: boolean;
}

export const StudentLoginActivityModal = ({
  studentEmail,
  studentName,
  isOpen,
  onClose,
}: StudentLoginActivityModalProps) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['student-login-activity-hybrid', studentEmail],
    queryFn: async (): Promise<DailyActivity[]> => {
      const { data, error } = await supabase.rpc('get_student_activity_hybrid', {
        p_student_email: studentEmail,
        p_days_limit: 30
      });

      if (error) {
        console.error('Erro ao buscar atividades:', error);
        throw error;
      }

      return data || [];
    },
    enabled: isOpen && !!studentEmail,
    refetchInterval: 30000, // Atualizar a cada 30 segundos para mostrar dados em tempo real
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Nenhum login registrado';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pegar a atividade mais recente
  const latestActivity = activities?.[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5" />
            Histórico de Login - {studentName}
          </DialogTitle>
          <DialogDescription>
            Informações sobre os acessos e atividades do aluno nos últimos 30 dias
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Card de Resumo */}
            {latestActivity && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 text-blue-900">
                    Último Acesso
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Data/Hora:</span>
                      <span>{formatDateTime(latestActivity.last_login_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Tempo Logado:</span>
                      <span>{latestActivity.formatted_duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Sessões no dia:</span>
                      <span>{latestActivity.total_sessions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Histórico Diário */}
            <div>
              <h3 className="font-semibold mb-3">Histórico (últimos 30 dias)</h3>

              {!activities || activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma atividade registrada nos últimos 30 dias.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <Card key={index} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatDate(activity.reference_date)}
                              </span>
                              {activity.is_today && (
                                <Badge className="bg-blue-100 text-blue-800 animate-pulse">
                                  ⚡ Tempo Real
                                </Badge>
                              )}
                              {activity.had_essay && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  {activity.essays_count} redação{activity.essays_count > 1 ? 'ões' : ''}
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Login: {formatDateTime(activity.last_login_at)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Duração: {activity.formatted_duration}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <LogIn className="w-3 h-3" />
                                <span>{activity.total_sessions} sessão{activity.total_sessions !== 1 ? 'ões' : ''}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            {activity.last_login_at ? (
                              <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                            ) : (
                              <Badge variant="secondary">Sem login</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
