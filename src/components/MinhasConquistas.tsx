import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Calendar, Eye, Award, TrendingUp } from "lucide-react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar plugins do dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

interface MonthlyActivity {
  essays_regular: number;
  essays_simulado: number;
  lousas_concluidas: number;
  lives_participei: number;
  gravadas_assistidas: number;
}

interface ActivityDetail {
  data_hora: string;
  tipo: string;
  acao: string;
  entity_id: string;
}

interface TopRankingInfo {
  isTop5: boolean;
  position?: number;
  points?: number;
  type?: 'regular' | 'simulado';
}

export const MinhasConquistas = () => {
  const { studentData } = useStudentAuth();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyActivity, setMonthlyActivity] = useState<MonthlyActivity>({
    essays_regular: 0,
    essays_simulado: 0,
    lousas_concluidas: 0,
    lives_participei: 0,
    gravadas_assistidas: 0
  });
  const [activityDetails, setActivityDetails] = useState<ActivityDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [topRanking, setTopRanking] = useState<TopRankingInfo>({ isTop5: false });

  useEffect(() => {
    if (studentData.email) {
      loadMonthlyActivity();
      checkTopRanking();
    }
  }, [studentData.email, selectedMonth, selectedYear]);

  const loadMonthlyActivity = async () => {
    if (!studentData.email) return;

    setLoading(true);
    try {
      const emailBusca = studentData.email.toLowerCase().trim();
      
      // Definir intervalo do mês em timezone America/Fortaleza
      const monthStart = dayjs.tz(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01 00:00:00`, 'America/Fortaleza').startOf('month');
      const monthEnd = monthStart.add(1, 'month');
      
      console.log(`🔍 Buscando atividades do aluno ${emailBusca} para ${getMonthName(selectedMonth)}/${selectedYear}`);
      console.log(`📅 Intervalo: ${monthStart.toISOString()} até ${monthEnd.toISOString()}`);

      // Usar a mesma fonte que o MeuDesempenho: consultar as 3 tabelas diretamente
      const [redacoesRegulares, redacoesSimulado, redacoesExercicio] = await Promise.all([
        supabase.from('redacoes_enviadas')
          .select('id, data_envio, status, frase_tematica')
          .ilike('email_aluno', emailBusca)
          .gte('data_envio', monthStart.toISOString())
          .lt('data_envio', monthEnd.toISOString()),
        
        supabase.from('redacoes_simulado')
          .select('id, data_envio, frase_tematica')
          .ilike('email_aluno', emailBusca)
          .gte('data_envio', monthStart.toISOString())
          .lt('data_envio', monthEnd.toISOString()),
          
        supabase.from('redacoes_exercicio')
          .select('id, data_envio, exercicio_id')
          .ilike('email_aluno', emailBusca)
          .gte('data_envio', monthStart.toISOString())
          .lt('data_envio', monthEnd.toISOString())
      ]);

      // Buscar eventos da lousa no mesmo período
      const { data: eventosLousa } = await supabase
        .from('student_feature_event')
        .select('action')
        .eq('student_email', emailBusca)
        .eq('feature', 'lousa')
        .eq('action', 'completed')
        .gte('occurred_at', monthStart.toISOString())
        .lt('occurred_at', monthEnd.toISOString());

      // Buscar participações em aulas ao vivo no mesmo período
      const { data: eventosLive } = await supabase
        .from('student_feature_event')
        .select('action')
        .eq('student_email', emailBusca)
        .eq('feature', 'live')
        .eq('action', 'participated')
        .gte('occurred_at', monthStart.toISOString())
        .lt('occurred_at', monthEnd.toISOString());

      // Buscar aulas gravadas assistidas no mesmo período
      const { data: eventosGravadas } = await supabase
        .from('student_feature_event')
        .select('action')
        .eq('student_email', emailBusca)
        .eq('feature', 'gravada')
        .eq('action', 'watched')
        .gte('occurred_at', monthStart.toISOString())
        .lt('occurred_at', monthEnd.toISOString());

      // Contabilizar (excluindo devolvidas apenas na tabela que tem status)
      const regularCount = (redacoesRegulares.data || []).filter(r => r.status !== 'devolvida').length;
      const simuladoCount = (redacoesSimulado.data || []).length; // simulado não tem status
      const exercicioCount = (redacoesExercicio.data || []).length; // exercicio não tem status
      
      console.log(`📊 Resultado: Regular=${regularCount}, Simulado=${simuladoCount}, Exercício=${exercicioCount}`);
      console.log(`📊 Lousa=${(eventosLousa || []).length}, Live=${(eventosLive || []).length}, Gravadas=${(eventosGravadas || []).length}`);

      setMonthlyActivity({
        essays_regular: regularCount + exercicioCount, // Exercícios contam como regulares
        essays_simulado: simuladoCount,
        lousas_concluidas: (eventosLousa || []).length,
        lives_participei: (eventosLive || []).length,
        gravadas_assistidas: (eventosGravadas || []).length
      });
      
    } catch (error) {
      console.error('Erro ao carregar atividades mensais:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar atividades do mês",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActivityDetails = async () => {
    if (!studentData.email) return;

    setLoading(true);
    try {
      // Consultar diretamente a tabela student_feature_event
      const { data, error } = await supabase
        .from('student_feature_event')
        .select(`
          occurred_at,
          feature,
          action,
          entity_id
        `)
        .eq('student_email', studentData.email.toLowerCase())
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('occurred_at', { ascending: false });

      if (error) throw error;
      
      const formattedData: ActivityDetail[] = (data || []).map(item => ({
        data_hora: new Date(item.occurred_at).toLocaleString('pt-BR', {
          timeZone: 'America/Fortaleza',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        tipo: item.feature === 'essay_regular' ? 'Redação (Regular)' :
              item.feature === 'essay_simulado' ? 'Redação (Simulado)' :
              item.feature === 'lousa' ? 'Lousa' :
              item.feature === 'live' ? 'Aula ao Vivo' :
              item.feature === 'gravada' ? 'Aula Gravada' : item.feature,
        acao: item.action === 'submitted' ? 'Enviado' :
              item.action === 'opened' ? 'Aberta' :
              item.action === 'completed' ? 'Concluída' :
              item.action === 'participated' ? 'Participei' :
              item.action === 'not_participated' ? 'Não participei' :
              item.action === 'watched' ? 'Assistiu' : item.action,
        entity_id: item.entity_id || ''
      }));
      
      setActivityDetails(formattedData);
    } catch (error) {
      console.error('Erro ao carregar detalhes das atividades:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes das atividades",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkTopRanking = () => {
    // TODO: Integrar com o ranking existente do front-end
    // Por enquanto, retorna false pois o ranking permanece no front-end atual
    setTopRanking({ isTop5: false });
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  const handleDetailsOpen = () => {
    if (!detailsOpen) {
      loadActivityDetails();
    }
    setDetailsOpen(true);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Minhas Conquistas
          {topRanking.isTop5 && (
            <Badge variant="default" className="bg-yellow-500 text-yellow-50 ml-2">
              <Award className="h-3 w-3 mr-1" />
              Top 5 (#{topRanking.position} • {topRanking.points} pts)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seletor de mês */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}>
            <SelectTrigger className="w-40">
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
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 3}, (_, i) => {
                const year = new Date().getFullYear() - 1 + i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Estatísticas do mês */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Redações:</span>
            <div className="flex gap-4 text-sm">
              <span>Regular: <strong className="text-blue-600">{monthlyActivity.essays_regular}</strong></span>
              <span>Simulado: <strong className="text-green-600">{monthlyActivity.essays_simulado}</strong></span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Ao vivo:</span>
            <span className="text-sm">Participei: <strong className="text-orange-600">{monthlyActivity.lives_participei}</strong></span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Gravadas:</span>
            <span className="text-sm">Assistidas: <strong className="text-red-600">{monthlyActivity.gravadas_assistidas}</strong></span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Lousa:</span>
            <span className="text-sm">Concluídas: <strong className="text-purple-600">{monthlyActivity.lousas_concluidas}</strong></span>
          </div>
        </div>

        {/* Botão ver detalhes */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full" onClick={handleDetailsOpen}>
              <Eye className="h-4 w-4 mr-2" />
              Ver detalhes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Histórico de Atividades - {getMonthName(selectedMonth)} {selectedYear}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-blue-600">{monthlyActivity.essays_regular}</div>
                    <div className="text-xs text-muted-foreground">Regular</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-green-600">{monthlyActivity.essays_simulado}</div>
                    <div className="text-xs text-muted-foreground">Simulado</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-purple-600">{monthlyActivity.lousas_concluidas}</div>
                    <div className="text-xs text-muted-foreground">Lousa</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-orange-600">{monthlyActivity.lives_participei}</div>
                    <div className="text-xs text-muted-foreground">Ao Vivo</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-red-600">{monthlyActivity.gravadas_assistidas}</div>
                    <div className="text-xs text-muted-foreground">Gravadas</div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela de detalhes */}
              {loading ? (
                <div className="text-center py-8">Carregando histórico...</div>
              ) : activityDetails.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityDetails.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell>{detail.data_hora}</TableCell>
                        <TableCell>{detail.tipo}</TableCell>
                        <TableCell>{detail.acao}</TableCell>
                        <TableCell className="font-mono text-sm">{detail.entity_id || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma atividade registrada neste período
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};