import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { TODAS_TURMAS, formatTurmaDisplay } from "@/utils/turmaUtils";
import { AlunoBoletimSheet } from "@/components/admin/AlunoBoletimSheet";

interface StudentActivity {
  profile_id: string;
  nome: string;
  student_email: string;
  essays_regular: number;
  essays_simulado: number;
  lousas_concluidas: number;
  lives_participei: number;
  gravadas_assistidas: number;
}

// Turmas geradas dinamicamente a partir do utils
const TURMAS = TODAS_TURMAS.map(turma => formatTurmaDisplay(turma));

export const MonitoramentoPage = () => {
  const { toast } = useToast();
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStudent, setSelectedStudent] = useState<StudentActivity | null>(null);
  const [students, setStudents] = useState<StudentActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [boletimOpen, setBoletimOpen] = useState(false);

  // Debounce para os filtros
  const [filterTimeout, setFilterTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounce para carregar alunos
  const debouncedLoadStudents = useCallback(() => {
    if (filterTimeout) {
      clearTimeout(filterTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (selectedTurma) {
        loadStudents();
      } else {
        setStudents([]);
        setSelectedStudent(null);
      }
    }, 300);
    
    setFilterTimeout(timeout);
  }, [selectedTurma, selectedMonth, selectedYear]);

  // Carregar alunos quando filtros mudam
  useEffect(() => {
    debouncedLoadStudents();
    return () => {
      if (filterTimeout) {
        clearTimeout(filterTimeout);
      }
    };
  }, [debouncedLoadStudents]);


  const loadStudents = async () => {
    if (!selectedTurma) return;
    
    setLoading(true);
    try {
      // Calcular janela mensal com timezone Fortaleza
      const baseDate = toZonedTime(new Date(selectedYear, selectedMonth - 1, 1), 'America/Fortaleza');
      const monthStart = startOfMonth(baseDate);
      const monthEnd = endOfMonth(baseDate);

      // Consultar alunos da turma
      const { data: alunosData, error: alunosError } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('user_type', 'aluno')
        .eq('ativo', true)
        .eq('turma', selectedTurma)
        .order('nome');

      if (alunosError) throw alunosError;

      // Consulta única agregada para todas as métricas
      const emailList = (alunosData || []).map(a => a.email.toLowerCase().trim());
      
      if (emailList.length === 0) {
        setStudents([]);
        return;
      }

      // Fazer consultas agregadas diretas (função RPC removida para simplificar)
      let studentsWithActivity: StudentActivity[] = [];
      // Fazer consultas agregadas diretas
      const [redacoesRegularesData, redacoesSimuladoData, lousasData, presencasData] = await Promise.all([
          // Redações regulares
          supabase
            .from('redacoes_enviadas')
            .select('email_aluno, id')
            .in('email_aluno', emailList)
            .gte('data_envio', monthStart.toISOString())
            .lt('data_envio', monthEnd.toISOString())
            .neq('status', 'devolvida'),
          
          // Redações simulado  
          supabase
            .from('redacoes_simulado') 
            .select('email_aluno, id')
            .in('email_aluno', emailList)
            .gte('data_envio', monthStart.toISOString())
            .lt('data_envio', monthEnd.toISOString())
            .is('devolvida_por', null),
          
          // Lousas (contar DISTINCT lousa_id onde submitted_at não é null)
          supabase
            .from('lousa_resposta')
            .select('email_aluno, lousa_id')
            .in('email_aluno', emailList)
            .not('submitted_at', 'is', null)
            .gte('submitted_at', monthStart.toISOString())
            .lt('submitted_at', monthEnd.toISOString()),
          
          // Presenças (contar DISTINCT aula_id)
          supabase
            .from('presenca_aulas')
            .select('email_aluno, aula_id')
            .in('email_aluno', emailList)
            .not('entrada_at', 'is', null)
            .gte('entrada_at', monthStart.toISOString())
            .lt('entrada_at', monthEnd.toISOString())
      ]);

      // Agregar os dados por email
      const metricsMap = new Map<string, any>();
      
      // Inicializar com zeros
      emailList.forEach(email => {
        metricsMap.set(email, {
          essays_regular: 0,
          essays_simulado: 0,
          lousas_concluidas: 0,
          lives_participei: 0,
          gravadas_assistidas: 0
        });
      });

      // Contar redações regulares
      (redacoesRegularesData.data || []).forEach(r => {
        const email = r.email_aluno.toLowerCase().trim();
        const metrics = metricsMap.get(email);
        if (metrics) metrics.essays_regular++;
      });

      // Contar redações simulado
      (redacoesSimuladoData.data || []).forEach(r => {
        const email = r.email_aluno.toLowerCase().trim();
        const metrics = metricsMap.get(email);
        if (metrics) metrics.essays_simulado++;
      });

      // Contar lousas (DISTINCT lousa_id por email)
      const lousasSet = new Map<string, Set<string>>();
      (lousasData.data || []).forEach(l => {
        const email = l.email_aluno.toLowerCase().trim();
        if (!lousasSet.has(email)) lousasSet.set(email, new Set());
        lousasSet.get(email)!.add(l.lousa_id);
      });
      lousasSet.forEach((lousaIds, email) => {
        const metrics = metricsMap.get(email);
        if (metrics) metrics.lousas_concluidas = lousaIds.size;
      });

      // Contar presenças (DISTINCT aula_id por email) 
      const presencasSet = new Map<string, Set<string>>();
      (presencasData.data || []).forEach(p => {
        const email = p.email_aluno.toLowerCase().trim();
        if (!presencasSet.has(email)) presencasSet.set(email, new Set());
        presencasSet.get(email)!.add(p.aula_id);
      });
      presencasSet.forEach((aulaIds, email) => {
        const metrics = metricsMap.get(email);
        if (metrics) metrics.lives_participei = aulaIds.size;
      });

      // Montar resultado final
      studentsWithActivity = (alunosData || []).map(aluno => {
        const email = aluno.email.toLowerCase().trim();
        const metrics = metricsMap.get(email) || {
          essays_regular: 0,
          essays_simulado: 0,
          lousas_concluidas: 0,
          lives_participei: 0,
          gravadas_assistidas: 0
        };

        return {
          profile_id: aluno.id,
          nome: aluno.nome,
          student_email: email,
          ...metrics
        };
        });

      setStudents(studentsWithActivity);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos alunos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  function handleAbrirBoletim(student: StudentActivity) {
    setSelectedStudent(student);
    setBoletimOpen(true);
  }

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Monitoramento de Aproveitamento</h3>
        <p className="text-sm text-muted-foreground">
          Acompanhe o aproveitamento dos alunos por turma e período.
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(value) => setSelectedMonth(Number(value))}
                disabled={loading}
              >
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
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(Number(value))}
                disabled={loading}
              >
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
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Período: {getMonthName(selectedMonth)} {selectedYear}</span>
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
        </CardContent>
      </Card>

      {/* Chips de Turmas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Turmas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TURMAS.map((turma) => (
              <Badge
                key={turma}
                variant={selectedTurma === turma ? "default" : "secondary"}
                className="cursor-pointer hover:bg-primary/90 transition-colors"
                onClick={() => !loading && setSelectedTurma(turma)}
              >
                {turma}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alunos */}
      {selectedTurma && (
        <Card>
          <CardHeader>
            <CardTitle>Alunos - {selectedTurma} ({getMonthName(selectedMonth)} {selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({length: 5}).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {Array.from({length: 5}).map((_, j) => (
                            <div key={j} className="text-center">
                              <Skeleton className="h-6 w-8 mx-auto mb-1" />
                              <Skeleton className="h-3 w-12 mx-auto" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum aluno encontrado para os filtros selecionados
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <Card
                    key={student.profile_id}
                    className="cursor-pointer transition-colors hover:bg-muted/50 hover:border-primary/40"
                    onClick={() => handleAbrirBoletim(student)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <h4 className="font-medium truncate">{student.nome}</h4>
                        </div>
                        <div className="flex items-center gap-4 text-sm shrink-0">
                          <div className="text-center hidden sm:block">
                            <div className="font-semibold">{student.essays_regular}</div>
                            <div className="text-xs text-muted-foreground">Regular</div>
                          </div>
                          <div className="text-center hidden sm:block">
                            <div className="font-semibold">{student.essays_simulado}</div>
                            <div className="text-xs text-muted-foreground">Simulado</div>
                          </div>
                          <div className="text-center hidden md:block">
                            <div className="font-semibold">{student.lousas_concluidas}</div>
                            <div className="text-xs text-muted-foreground">Lousa</div>
                          </div>
                          <div className="text-center hidden md:block">
                            <div className="font-semibold">{student.lives_participei}</div>
                            <div className="text-xs text-muted-foreground">Ao Vivo</div>
                          </div>
                          <span className="text-xs text-primary font-medium">Ver boletim →</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlunoBoletimSheet
        open={boletimOpen}
        onOpenChange={setBoletimOpen}
        email={selectedStudent?.student_email ?? null}
        turma={selectedTurma || null}
        nomeAluno={selectedStudent?.nome ?? ""}
      />
    </div>
  );
};