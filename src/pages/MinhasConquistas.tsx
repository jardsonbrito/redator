import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Trophy } from "lucide-react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StudentHeader } from "@/components/StudentHeader";
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

// Função para classificar tipo de redação de forma consistente
function classificarTipo(redacao: any): 'regular' | 'simulado' {
  if (redacao.tipo) return redacao.tipo;
  if (redacao.tema?.is_simulado === true) return 'simulado';
  const str = `${redacao.tema?.categoria || ''} ${redacao.tema?.titulo || ''} ${redacao.frase_tematica || ''}`;
  return /simulado/i.test(str) ? 'simulado' : 'regular';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentData.email) {
      loadMonthlyActivity();
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

      // === USAR A MESMA FONTE QUE MeuDesempenho para CONSISTÊNCIA ===
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

      // === CLASSIFICAR POR TIPO DE FORMA ÚNICA ===
      // 1. Redações regulares (excluindo devolvidas)
      const regularesFiltradas = (redacoesRegulares.data || []).filter(r => r.status !== 'devolvida');

      // 2. Redações de simulado (todas são simulado por definição)
      const simuladoFiltradas = (redacoesSimulado.data || []);

      // 3. Redações de exercício (por enquanto considerar como regulares)
      const exercicioFiltradas = (redacoesExercicio.data || []);

      // === AGREGAR CONTADORES ===
      let regularCount = 0;
      let simuladoCount = 0;

      // Contar regulares (redacoes_enviadas + exercicio)
      regularCount += regularesFiltradas.length;
      regularCount += exercicioFiltradas.length;

      // Contar simulados (redacoes_simulado)
      simuladoCount += simuladoFiltradas.length;

      // === OUTRAS ATIVIDADES ===
      // Buscar presença em aulas ao vivo (nova tabela presenca_aulas)
      const { data: presencaLive } = await supabase
        .from('presenca_aulas')
        .select('aula_id, entrada_at')
        .eq('email_aluno', emailBusca)
        .gte('entrada_at', monthStart.toISOString())
        .lt('entrada_at', monthEnd.toISOString())
        .not('entrada_at', 'is', null);

      // Contar distinct aulas que participou (entrada registrada)
      const livesParticipadas = [...new Set((presencaLive || []).map(p => p.aula_id))].length;

      // Buscar eventos de lousa (via student_feature_event)
      const { data: eventosLousa } = await supabase
        .from('student_feature_event')
        .select('entity_id')
        .eq('student_email', emailBusca)
        .eq('feature', 'lousa')
        .eq('action', 'completed')
        .gte('occurred_at', monthStart.toISOString())
        .lt('occurred_at', monthEnd.toISOString());

      // Buscar aulas gravadas assistidas
      const { data: eventosGravadas } = await supabase
        .from('student_feature_event')
        .select('entity_id')
        .eq('student_email', emailBusca)
        .eq('feature', 'gravada')
        .eq('action', 'watched')
        .gte('occurred_at', monthStart.toISOString())
        .lt('occurred_at', monthEnd.toISOString());

      console.log(`📊 Resultado: Regular=${regularCount}, Simulado=${simuladoCount}`);
      console.log(`📊 Lousa=${(eventosLousa || []).length}, Live=${livesParticipadas}, Gravadas=${(eventosGravadas || []).length}`);

      setMonthlyActivity({
        essays_regular: regularCount,
        essays_simulado: simuladoCount,
        lousas_concluidas: (eventosLousa || []).length,
        lives_participei: livesParticipadas,
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

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader pageTitle="Minhas Conquistas" />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary mb-2">Minhas Conquistas</h1>
              <p className="text-muted-foreground">
                Acompanhe suas atividades por mês
              </p>
            </div>
            <div className="text-center py-8">Carregando...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader pageTitle="Minhas Conquistas" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-2">Minhas Conquistas</h1>
            <p className="text-muted-foreground">
              Acompanhe suas atividades por mês
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Atividades do Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filtros de mês e ano */}
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

              {/* Contadores das atividades */}
              <div className="space-y-2 max-w-[420px]">
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <span className="text-sm font-medium">Redações:</span>
                  <div className="flex gap-3 text-sm">
                    <span>Regular: <strong className="text-blue-600">{monthlyActivity.essays_regular}</strong></span>
                    <span>Simulado: <strong className="text-green-600">{monthlyActivity.essays_simulado}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <span className="text-sm font-medium">Ao vivo:</span>
                  <span className="text-sm">Participei: <strong className="text-orange-600">{monthlyActivity.lives_participei}</strong></span>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <span className="text-sm font-medium">Gravadas:</span>
                  <span className="text-sm">Assistidas: <strong className="text-red-600">{monthlyActivity.gravadas_assistidas}</strong></span>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <span className="text-sm font-medium">Lousa:</span>
                  <span className="text-sm">Concluídas: <strong className="text-purple-600">{monthlyActivity.lousas_concluidas}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MinhasConquistas;