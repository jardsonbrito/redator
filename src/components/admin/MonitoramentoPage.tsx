import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileSpreadsheet, Users, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";

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

interface StudentDetail {
  data_hora: string;
  tipo: string;
  acao: string;
  entity_id: string;
  metadata: any;
}

const TURMAS = ['Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E'];

export const MonitoramentoPage = () => {
  const { toast } = useToast();
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStudent, setSelectedStudent] = useState<StudentActivity | null>(null);
  const [students, setStudents] = useState<StudentActivity[]>([]);
  const [studentDetails, setStudentDetails] = useState<StudentDetail[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Carregar detalhes do aluno selecionado
  useEffect(() => {
    if (selectedStudent) {
      loadStudentDetails();
    } else {
      setStudentDetails([]);
    }
  }, [selectedStudent, selectedMonth, selectedYear]);

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

  const loadStudentDetails = async () => {
    if (!selectedStudent) return;

    setLoading(true);
    try {
      // Consultar diretamente a tabela student_feature_event
      const { data, error } = await supabase
        .from('student_feature_event')
        .select(`
          occurred_at,
          feature,
          action,
          entity_id,
          metadata
        `)
        .eq('student_email', selectedStudent.student_email)
        .eq('class_name', selectedTurma)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('occurred_at', { ascending: false });

      if (error) throw error;

      const formattedData: StudentDetail[] = (data || []).map(item => ({
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
        entity_id: item.entity_id || '',
        metadata: item.metadata
      }));

      setStudentDetails(formattedData);
    } catch (error) {
      console.error('Erro ao carregar detalhes do aluno:', error);
      toast({
        title: "Erro", 
        description: "Erro ao carregar detalhes do aluno",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!selectedStudent || studentDetails.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione um aluno com atividades para exportar",
        variant: "destructive"
      });
      return;
    }

    const csvContent = [
      ['Data/Hora', 'Tipo', 'Ação', 'ID da Entidade'],
      ...studentDetails.map(detail => [
        detail.data_hora,
        detail.tipo,
        detail.acao,
        detail.entity_id || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `atividades_${selectedStudent.nome}_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso",
    });
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
                    className={`transition-colors ${
                      selectedStudent?.profile_id === student.profile_id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{student.nome}</h4>
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-sm">
                          <div className="text-center">
                            <div className="font-semibold">{student.essays_regular}</div>
                            <div className="text-xs text-muted-foreground">Regular</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{student.essays_simulado}</div>
                            <div className="text-xs text-muted-foreground">Simulado</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{student.lousas_concluidas}</div>
                            <div className="text-xs text-muted-foreground">Lousa</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{student.lives_participei}</div>
                            <div className="text-xs text-muted-foreground">Ao Vivo</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{student.gravadas_assistidas}</div>
                            <div className="text-xs text-muted-foreground">Gravadas</div>
                          </div>
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

      {/* Detalhes do Aluno */}
      {selectedStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Detalhes - {selectedStudent.nome}</span>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Cards de resumo */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedStudent.essays_regular}</div>
                  <div className="text-sm text-muted-foreground">Redações Regular</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedStudent.essays_simulado}</div>
                  <div className="text-sm text-muted-foreground">Redações Simulado</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedStudent.lousas_concluidas}</div>
                  <div className="text-sm text-muted-foreground">Lousa Concluída</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{selectedStudent.lives_participei}</div>
                  <div className="text-sm text-muted-foreground">Live Participei</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{selectedStudent.gravadas_assistidas}</div>
                  <div className="text-sm text-muted-foreground">Gravadas Assistidas</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de eventos */}
            {studentDetails.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>ID da Entidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentDetails.map((detail, index) => (
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
                Nenhuma atividade registrada para este aluno no período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};