import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Video, Users, Download, Calendar } from "lucide-react";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

interface StudentRadarData {
  student_id: string;
  student_name: string;
  student_email: string;
  turma: string;
  recorded_lessons_count: number;
}

export const MonitoramentoGravadas = () => {
  const [students, setStudents] = useState<StudentRadarData[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<string>('todas');
  const [turmas, setTurmas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRadarData();
  }, []);

  const loadRadarData = async () => {
    setLoading(true);
    try {
      console.log('🔥 Radar: Buscando dados via get_recorded_lessons_radar...');
      const { data, error } = await supabase.rpc('get_recorded_lessons_radar');
      
      if (error) {
        console.error('Erro ao buscar radar de vídeos:', error);
        throw error;
      }

      console.log('🔥 Radar: Dados recebidos:', data);
      console.log('🔥 Radar: Antônia encontrada:', data?.find(s => s.student_name?.includes('Antônia')));
      
      const studentsData = data || [];
      setStudents(studentsData);

      // Extrair turmas únicas
      const uniqueTurmas = [...new Set(studentsData.map(s => s.turma).filter(Boolean))];
      setTurmas(uniqueTurmas.sort());

    } catch (error) {
      console.error('Erro ao carregar radar de vídeos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do radar de vídeos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const filteredStudents = selectedTurma === 'todas' 
      ? students 
      : students.filter(s => s.turma === selectedTurma);

    const csvHeaders = [
      'Nome do Aluno',
      'Email',
      'Turma',
      'Vídeos Assistidos (Mês Atual)'
    ];

    const csvData = filteredStudents.map(student => [
      student.student_name,
      student.student_email,
      student.turma || 'Não informado',
      student.recorded_lessons_count.toString()
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `radar_videos_${dayjs().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMonthName = () => {
    return dayjs().tz('America/Fortaleza').format('MMMM YYYY');
  };

  const filteredStudents = selectedTurma === 'todas' 
    ? students 
    : students.filter(s => s.turma === selectedTurma);

  const totalWatched = filteredStudents.reduce((sum, s) => sum + s.recorded_lessons_count, 0);
  const activeStudents = filteredStudents.filter(s => s.recorded_lessons_count > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do radar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" key={Date.now()}> {/* Força re-render */}
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6" />
            Radar - Vídeos
          </h2>
          <p className="text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="h-4 w-4" />
            Período: {getMonthName()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedTurma} onValueChange={setSelectedTurma}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as turmas</SelectItem>
              {turmas.map(turma => (
                <SelectItem key={turma} value={turma}>
                  {turma}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Alunos</p>
                <p className="text-2xl font-bold">{filteredStudents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Alunos Ativos</p>
                <p className="text-2xl font-bold">{activeStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Assistidas</p>
                <p className="text-2xl font-bold">{totalWatched}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Vídeos por Aluno
            {selectedTurma !== 'todas' && (
              <Badge variant="secondary">
                Turma: {selectedTurma}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead className="text-center">Vídeos</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents
                    .sort((a, b) => b.recorded_lessons_count - a.recorded_lessons_count)
                    .map((student) => (
                      <TableRow key={student.student_id}>
                        <TableCell className="font-medium">
                          {student.student_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {student.student_email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {student.turma || 'Não informado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={student.recorded_lessons_count > 0 ? "default" : "secondary"}
                          >
                            {student.recorded_lessons_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {student.recorded_lessons_count > 0 ? (
                            <Badge variant="default" className="bg-green-100 text-green-700">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              Sem atividade
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum aluno encontrado
                      {selectedTurma !== 'todas' && ` na turma ${selectedTurma}`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};