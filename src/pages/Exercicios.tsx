import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentHeader } from "@/components/StudentHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Search, FileText, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Exercicio {
  id: string;
  titulo: string;
  tipo: string;
  link_forms?: string;
  tema_id?: string;
  imagem_capa_url?: string;
  turmas_autorizadas: string[];
  permite_visitante: boolean;
  ativo: boolean;
  criado_em: string;
  temas?: {
    frase_tematica: string;
    eixo_tematico: string;
  };
}

const Exercicios = () => {
  const { studentData } = useStudentAuth();
  const navigate = useNavigate();
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [filteredExercicios, setFilteredExercicios] = useState<Exercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  const tiposDisponiveis = [
    'Google Forms',
    'Redação com Frase Temática'
  ];

  useEffect(() => {
    fetchExercicios();
  }, []);

  useEffect(() => {
    filterExercicios();
  }, [exercicios, searchTerm, tipoFilter]);

  const fetchExercicios = async () => {
    try {
      const { data, error } = await supabase
        .from("exercicios")
        .select(`
          *,
          temas (
            frase_tematica,
            eixo_tematico
          )
        `)
        .eq("ativo", true)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setExercicios(data || []);
    } catch (error) {
      console.error("Erro ao buscar exercícios:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterExercicios = () => {
    let filtered = exercicios.filter(exercicio => {
      // Verificar se o usuário tem acesso
      const isVisitante = studentData.userType === "visitante";
      const userTurma = studentData.turma;

      // Permitir se for visitante e exercício permite visitante
      if (isVisitante && exercicio.permite_visitante) return true;
      
      // Permitir se for aluno e está na turma autorizada ou se turmas_autorizadas está vazio
      if (!isVisitante && userTurma && 
          (exercicio.turmas_autorizadas.length === 0 || exercicio.turmas_autorizadas.includes(userTurma))) {
        return true;
      }

      return false;
    });

    // Aplicar filtros de busca
    if (searchTerm) {
      filtered = filtered.filter(exercicio =>
        exercicio.titulo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (tipoFilter) {
      filtered = filtered.filter(exercicio => exercicio.tipo === tipoFilter);
    }

    setFilteredExercicios(filtered);
  };

  const handleRedacaoExercicio = (exercicio: Exercicio) => {
    if (exercicio.tema_id) {
      // Navegar para a página de redação com o tema do exercício
      navigate(`/temas/${exercicio.tema_id}?exercicio=${exercicio.id}`);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <StudentHeader />
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center py-8">Carregando exercícios...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
        <StudentHeader />
        
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-redator-primary mb-4">Exercícios</h1>
            <p className="text-lg text-redator-accent">
              Pratique com exercícios direcionados e desenvolva suas habilidades
            </p>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    placeholder="Buscar por título..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os tipos</SelectItem>
                      {tiposDisponiveis.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Exercícios */}
          <div className="grid gap-6">
            {filteredExercicios.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-xl font-semibold text-redator-primary mb-2">
                    Nenhum exercício disponível no momento.
                  </h3>
                  <p className="text-redator-accent">
                    Verifique novamente em breve ou entre em contato com sua coordenação.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredExercicios.map((exercicio) => (
                <Card key={exercicio.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl mb-2">{exercicio.titulo}</CardTitle>
                        <div className="flex gap-2 mb-2">
                          <Badge variant="outline">
                            {exercicio.tipo}
                          </Badge>
                          {exercicio.temas && (
                            <Badge variant="secondary">
                              {exercicio.temas.eixo_tematico}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {exercicio.tipo === 'Google Forms' && exercicio.link_forms && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => window.open(exercicio.link_forms, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir Formulário
                          </Button>
                        )}
                        {exercicio.tipo === 'Redação com Frase Temática' && exercicio.tema_id && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleRedacaoExercicio(exercicio)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Escrever Redação
                          </Button>
                        )}
                        {exercicio.imagem_capa_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(exercicio.imagem_capa_url, '_blank')}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Ver Imagem
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {exercicio.temas && (
                      <div className="mb-3">
                        <strong>Tema:</strong> {exercicio.temas.frase_tematica}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Exercicios;