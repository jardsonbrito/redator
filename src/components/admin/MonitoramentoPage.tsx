import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ChevronRight, Loader2, GraduationCap, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TODAS_TURMAS, formatTurmaDisplay } from "@/utils/turmaUtils";
// startOfMonth, endOfMonth, toZonedTime removidos (métricas por aluno carregadas no boletim)
import { AlunoBoletimSheet } from "@/components/admin/AlunoBoletimSheet";

interface StudentActivity {
  profile_id: string;
  nome: string;
  student_email: string;
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
      const { data: alunosData, error: alunosError } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .eq('user_type', 'aluno')
        .eq('ativo', true)
        .eq('turma', selectedTurma)
        .order('nome');

      if (alunosError) throw alunosError;

      setStudents((alunosData || []).map(aluno => ({
        profile_id: aluno.id,
        nome: aluno.nome,
        student_email: aluno.email.toLowerCase().trim(),
      })));
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
    <div className="space-y-5">
      {/* Cabeçalho + Período */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">Período:</span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(Number(value))}
            disabled={loading}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {getMonthName(i + 1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(Number(value))}
            disabled={loading}
          >
            <SelectTrigger className="h-8 w-24 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Seletor de Turmas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Selecione a turma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TURMAS.map((turma) => (
              <button
                key={turma}
                disabled={loading}
                onClick={() => setSelectedTurma(selectedTurma === turma ? '' : turma)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTurma === turma
                    ? 'bg-[#3F0077] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {turma}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alunos */}
      {selectedTurma && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4" />
              {selectedTurma} — {getMonthName(selectedMonth)} {selectedYear}
              {!loading && students.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({students.length} aluno{students.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-52" />
                    </div>
                  </div>
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Nenhum aluno encontrado nesta turma
              </div>
            ) : (
              <div className="divide-y">
                {students.map((student, index) => (
                  <button
                    key={student.profile_id}
                    className="w-full flex items-center gap-3 px-6 py-3 hover:bg-muted/40 transition-colors text-left group"
                    onClick={() => handleAbrirBoletim(student)}
                  >
                    <div className="h-8 w-8 rounded-full bg-[#3F0077]/10 text-[#3F0077] flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-tight truncate">{student.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">{student.student_email}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-[#3F0077] transition-colors" />
                  </button>
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