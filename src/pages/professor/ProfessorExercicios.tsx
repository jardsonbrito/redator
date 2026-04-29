import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotebookPen, ArrowLeft, Search, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseCard } from "@/components/ui/exercise-card";
import { getExerciseAvailability } from "@/utils/exerciseUtils";

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
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

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

  const filtered = exercicios.filter((ex) => {
    const matchSearch = !searchTerm || ex.titulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !tipoFilter || tipoFilter === "todos" || ex.tipo === tipoFilter;
    return matchSearch && matchTipo;
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link to="/professor/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <NotebookPen className="w-6 h-6 text-primary" />
                </div>
                Exercícios
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Exercícios disponibilizados pelo Laboratório
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filtros */}
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

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white/80 border border-primary/10">
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold text-muted-foreground">
                Nenhum exercício disponível no momento.
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os exercícios disponibilizados pelo Laboratório aparecerão aqui.
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
