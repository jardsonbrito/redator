import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  // Carregar alunos da turma selecionada
  useEffect(() => {
    if (selectedTurma) {
      loadStudents();
    } else {
      setStudents([]);
      setSelectedStudent(null);
    }
  }, [selectedTurma, selectedMonth, selectedYear]);

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
      const { data, error } = await supabase.rpc('get_students_monthly_activity', {
        p_class_name: selectedTurma,
        p_month: selectedMonth,
        p_year: selectedYear
      });

      if (error) throw error;
      setStudents(data || []);
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
      const { data, error } = await supabase.rpc('get_student_activity_details', {
        p_student_email: selectedStudent.student_email,
        p_class_name: selectedTurma,
        p_month: selectedMonth,
        p_year: selectedYear
      });

      if (error) throw error;
      setStudentDetails(data || []);
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
                className="cursor-pointer hover:bg-primary/90"
                onClick={() => setSelectedTurma(turma)}
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
              <div className="text-center py-8">Carregando...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum aluno encontrado para os filtros selecionados
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <Card 
                    key={student.profile_id}
                    className={`cursor-pointer transition-colors ${
                      selectedStudent?.profile_id === student.profile_id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{student.nome}</h4>
                          <p className="text-sm text-muted-foreground">{student.student_email}</p>
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