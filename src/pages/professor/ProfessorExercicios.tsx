import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseCard } from "@/components/ui/exercise-card";
import { getExerciseAvailability } from "@/utils/exerciseUtils";
import { StudentHeader } from "@/components/StudentHeader";
import { useProfessorAuth } from "@/hooks/useProfessorAuth";
import { usePageTitle } from "@/hooks/useBreadcrumbs";

interface Exercicio {
  id: string;
  titulo: string;
  tipo: string;
  link_forms?: string;
  tema_id?: string;
  imagem_capa_url?: string;
  cover_url?: string;
  cover_upload_url?: string;
  cover_upload_path?: string;
  turmas_autorizadas: string[] | null;
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
  abrir_aba_externa?: boolean;
  data_inicio?: string;
  hora_inicio?: string;
  data_fim?: string;
  hora_fim?: string;
  temas?: {
    frase_tematica: string;
    eixo_tematico: string;
    cover_url?: string;
    cover_file_path?: string;
  };
}

const TIPOS = ['Google Forms', 'Redação com Frase Temática', 'Produção Guiada'];

export const ProfessorExercicios = () => {
  const navigate = useNavigate();
  const { professor } = useProfessorAuth();
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  usePageTitle('Exercícios');

  useEffect(() => {
    const fetchExercicios = async () => {
      try {
        const { data, error } = await supabase
          .from("exercicios")
          .select(`*, temas(frase_tematica, eixo_tematico, cover_url, cover_file_path)`)
          .eq("ativo", true)
          .order("criado_em", { ascending: false });
        if (error) throw error;
        setExercicios(data || []);
      } catch (err) {
        console.error("Erro ao buscar exercícios:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExercicios();
  }, []);

  const professorTurma = professor?.turma_nome;

  const filtered = exercicios.filter((ex) => {
    const matchSearch = !searchTerm || ex.titulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !tipoFilter || tipoFilter === "todos" || ex.tipo === tipoFilter;
    const turmasAutorizadas = ex.turmas_autorizadas || [];
    const matchTurma =
      !!professorTurma &&
      turmasAutorizadas.length > 0 &&
      turmasAutorizadas.some((t) => t.toUpperCase() === professorTurma.toUpperCase());
    return matchSearch && matchTipo && matchTurma;
  });

  const handleExerciseAction = (exercicio: Exercicio) => {
    const availability = getExerciseAvailability(exercicio);
    if (availability.status === 'agendado') {
      alert('Este exercício ainda não está disponível.');
      return;
    }
    if (exercicio.tipo === 'Google Forms' && exercicio.link_forms) {
      window.open(exercicio.link_forms, '_blank');
    } else if (exercicio.tipo === 'Redação com Frase Temática' && exercicio.tema_id) {
      navigate(`/professor/temas/${exercicio.tema_id}`);
    } else if (exercicio.tipo === 'Produção Guiada') {
      navigate(`/exercicios/${exercicio.id}/producao-guiada`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <StudentHeader pageTitle="Exercícios" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="w-4 h-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {TIPOS.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white/80 border border-primary/10">
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold text-muted-foreground">
                Nenhum exercício disponível para sua turma.
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os exercícios destinados à sua turma aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((exercicio) => (
              <ExerciseCard
                key={exercicio.id}
                exercise={exercicio}
                onAction={handleExerciseAction}
                showActions={true}
                isAdmin={false}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
